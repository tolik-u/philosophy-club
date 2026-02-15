from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
from functools import wraps
import os
import requests as http_requests
from dotenv import load_dotenv
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# ============= Setup =============

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["https://club.linux.yoga", "http://localhost:8000"])
limiter = Limiter(get_remote_address, app=app, default_limits=["60 per minute"], storage_uri="memory://")

# MongoDB setup
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://127.0.0.1:27017")
client = MongoClient(MONGODB_URL)
db = client["philosophy_club"]

GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID",
    "256483321761-a4hsvv36hbeslq1l3vjm0souh7988fir.apps.googleusercontent.com"
)
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

print("\n========================================")
print("  Philosophy Club Backend Starting...  ")
print("========================================\n")

try:
    # Test MongoDB connection
    client.admin.command('ping')
    print("[+] MongoDB connected successfully")
except Exception as e:
    print(f"[!] MongoDB connection error: {e}")
    raise

# ============= Helper Functions =============

def exchange_code_for_token(code):
    """Exchange an authorization code for an ID token via Google's token endpoint"""
    try:
        resp = http_requests.post("https://oauth2.googleapis.com/token", data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": "postmessage",
            "grant_type": "authorization_code",
        })
        if resp.status_code != 200:
            print(f"[!] Token exchange failed: {resp.status_code} {resp.text}")
            return None
        return resp.json().get("id_token")
    except Exception as e:
        print(f"[!] Token exchange error: {e}")
        return None

def verify_google_token(token):
    """Verify Google JWT token and return user info"""
    try:
        idinfo = id_token.verify_oauth2_token(
            token, google_requests.Request(), GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=5
        )
        return idinfo.get("email"), idinfo.get("name")
    except ValueError as e:
        print(f"[!] Token verification failed: {e}")
        return None, None

def require_auth(f):
    """Decorator to require a valid Google token in Authorization header"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        token = auth_header.split(" ", 1)[1]
        email, _ = verify_google_token(token)
        if not email:
            return jsonify({"error": "Invalid or expired token"}), 401
        request.user_email = email
        return f(*args, **kwargs)
    return decorated

def require_admin(f):
    """Decorator to require admin role (must be used after require_auth)"""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = db["users"].find_one({"email": request.user_email})
        if not user or user.get("role") not in ("admin", "superadmin"):
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated

# ============= Authentication Endpoints =============

@app.route("/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    """Google login endpoint"""
    try:
        data = request.get_json()
        token = data.get("token")
        code = data.get("code")

        # New auth-code flow: exchange code for ID token
        if code:
            token = exchange_code_for_token(code)
            if not token:
                return jsonify({"error": "Code exchange failed"}), 401

        if not token:
            return jsonify({"error": "Missing token or code"}), 400

        # Verify token with Google and extract user info
        email, name = verify_google_token(token)
        if not email:
            return jsonify({"error": "Invalid token"}), 401

        users = db["users"]

        # Check if user exists
        existing_user = users.find_one({"email": email})

        if existing_user:
            return jsonify({
                "email": email,
                "name": existing_user.get("name"),
                "role": existing_user["role"],
                "id_token": token
            }), 200

        # New user - first user is admin
        user_count = users.count_documents({})
        role = "superadmin" if user_count == 0 else "user"

        # Create user
        users.insert_one({
            "email": email,
            "name": name,
            "role": role,
            "created_at": datetime.utcnow().isoformat()
        })

        message = "First user - superadmin created!" if role == "superadmin" else "User created"
        return jsonify({
            "email": email,
            "name": name,
            "role": role,
            "message": message,
            "id_token": token
        }), 200

    except Exception as e:
        print(f"[!] Login error: {e}")
        return jsonify({"error": "Login failed"}), 500


# ============= User Management Endpoints =============

@app.route("/users", methods=["GET"])
@require_auth
@require_admin
def list_users():
    """List all users"""
    try:
        users = db["users"]
        user_list = list(users.find({}, {"_id": 0, "email": 1, "name": 1, "role": 1}))
        return jsonify(user_list), 200
    except Exception as e:
        print(f"[!] List users error: {e}")
        return jsonify({"error": "Failed to list users"}), 500

@app.route("/users/<path:email>/role", methods=["PUT"])
@require_auth
@require_admin
@limiter.limit("10 per minute")
def update_user_role(email):
    """Promote or demote a user (admin only, cannot change own role)"""
    try:
        if email == request.user_email:
            return jsonify({"error": "Cannot change your own role"}), 400

        target = db["users"].find_one({"email": email})
        if not target:
            return jsonify({"error": "User not found"}), 404
        if target.get("role") == "superadmin":
            return jsonify({"error": "Cannot change a superadmin's role"}), 403

        data = request.get_json()
        new_role = data.get("role")
        if new_role not in ("admin", "user"):
            return jsonify({"error": "Role must be 'admin' or 'user'"}), 400

        result = db["users"].update_one(
            {"email": email},
            {"$set": {"role": new_role}}
        )
        if result.matched_count == 0:
            return jsonify({"error": "User not found"}), 404

        return jsonify({"email": email, "role": new_role}), 200
    except Exception as e:
        print(f"[!] Update user role error: {e}")
        return jsonify({"error": "Failed to update role"}), 500

# ============= Bottles Management Endpoints =============

@app.route("/whiskies/search", methods=["GET"])
@require_auth
@require_admin
@limiter.limit("60 per minute")
def search_whiskies():
    """Search the whiskies catalog using Atlas Search (admin only)"""
    try:
        q = request.args.get("q", "").strip()
        if len(q) < 2:
            return jsonify([]), 200

        pipeline = [
            {
                "$search": {
                    "index": "whiskies",
                    "text": {
                        "query": q,
                        "path": "name",
                        "fuzzy": {"maxEdits": 1}
                    }
                }
            },
            {"$limit": 10},
            {
                "$project": {
                    "_id": 0,
                    "name": 1,
                    "age": 1,
                    "strength": 1,
                    "bottle_size": 1,
                    "year_bottled": 1
                }
            }
        ]

        results = list(db["whiskies"].aggregate(pipeline))
        return jsonify(results), 200
    except Exception as e:
        print(f"[!] Search whiskies error: {e}")
        return jsonify({"error": "Search failed"}), 500

@app.route("/bottles", methods=["GET"])
@require_auth
def get_bottles():
    """Get all bottles from clubWhiskies collection"""
    try:
        bottles_collection = db["clubWhiskies"]
        bottles_cursor = bottles_collection.find({})

        bottles = []
        for bottle in bottles_cursor:
            bottles.append({
                "id": str(bottle["_id"]),
                "name": bottle.get("name", ""),
                "age": bottle.get("age", ""),
                "strength": bottle.get("strength", ""),
                "bottle_size": bottle.get("bottle_size", ""),
                "year_bottled": bottle.get("year_bottled", ""),
                "price": bottle.get("price", "")
            })

        return jsonify(bottles), 200
    except Exception as e:
        print(f"[!] Get bottles error: {e}")
        return jsonify({"error": "Failed to fetch bottles"}), 500

@app.route("/bottles", methods=["POST"])
@require_auth
@require_admin
@limiter.limit("30 per minute")
def create_bottle():
    """Create a new bottle (admin only)"""
    try:
        data = request.get_json()
        name = data.get("name", "").strip()
        if not name:
            return jsonify({"error": "Name is required"}), 400

        raw_price = data.get("price", "")
        if raw_price == "" or raw_price is None:
            return jsonify({"error": "Price is required"}), 400
        try:
            price = float(raw_price)
        except (ValueError, TypeError):
            return jsonify({"error": "Price must be a number"}), 400

        bottle = {
            "name": name,
            "age": str(data.get("age", "")).strip(),
            "strength": str(data.get("strength", "")).strip(),
            "bottle_size": str(data.get("bottle_size", "")).strip(),
            "year_bottled": str(data.get("year_bottled", "")).strip(),
            "price": price,
        }

        result = db["clubWhiskies"].insert_one(bottle)
        bottle["id"] = str(result.inserted_id)
        del bottle["_id"]
        return jsonify(bottle), 201
    except Exception as e:
        print(f"[!] Create bottle error: {e}")
        return jsonify({"error": "Failed to create bottle"}), 500

@app.route("/bottles/<bottle_id>", methods=["PUT"])
@require_auth
@require_admin
@limiter.limit("30 per minute")
def update_bottle(bottle_id):
    """Update a bottle (admin only)"""
    try:
        data = request.get_json()
        update_fields = {}

        for field in ["name", "age", "strength", "bottle_size", "year_bottled"]:
            if field in data:
                update_fields[field] = str(data[field]).strip()
        if "price" in data:
            try:
                update_fields["price"] = float(data["price"])
            except (ValueError, TypeError):
                return jsonify({"error": "Price must be a number"}), 400
        if "name" in update_fields and not update_fields["name"]:
            return jsonify({"error": "Name cannot be empty"}), 400

        if not update_fields:
            return jsonify({"error": "No fields to update"}), 400

        result = db["clubWhiskies"].update_one(
            {"_id": ObjectId(bottle_id)},
            {"$set": update_fields}
        )

        if result.matched_count == 0:
            return jsonify({"error": "Bottle not found"}), 404

        updated = db["clubWhiskies"].find_one({"_id": ObjectId(bottle_id)})
        return jsonify({
            "id": str(updated["_id"]),
            "name": updated.get("name", ""),
            "age": updated.get("age", ""),
            "strength": updated.get("strength", ""),
            "bottle_size": updated.get("bottle_size", ""),
            "year_bottled": updated.get("year_bottled", ""),
            "price": updated.get("price", "")
        }), 200
    except Exception as e:
        print(f"[!] Update bottle error: {e}")
        return jsonify({"error": "Failed to update bottle"}), 500

@app.route("/bottles/<bottle_id>", methods=["DELETE"])
@require_auth
@require_admin
@limiter.limit("30 per minute")
def delete_bottle(bottle_id):
    """Delete a bottle (admin only)"""
    try:
        result = db["clubWhiskies"].delete_one({"_id": ObjectId(bottle_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Bottle not found"}), 404
        return jsonify({"message": "Bottle deleted"}), 200
    except Exception as e:
        print(f"[!] Delete bottle error: {e}")
        return jsonify({"error": "Failed to delete bottle"}), 500

# ============= Health Check =============

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok"}), 200

# ============= Error Handlers =============

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500

# ============= Main =============

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    print(f"[*] Binding to 0.0.0.0:{port}...")
    print(f"[+] Backend ready! Visit http://127.0.0.1:{port}/health\n")
    app.run(host="0.0.0.0", port=port, debug=False)
