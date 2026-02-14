from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from pymongo import MongoClient
from datetime import datetime
from functools import wraps
import os
from dotenv import load_dotenv
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# ============= Setup =============

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["https://club.linux.yoga", "http://localhost:8000"])
limiter = Limiter(get_remote_address, app=app, default_limits=["60 per minute"])

# MongoDB setup
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://127.0.0.1:27017")
client = MongoClient(MONGODB_URL)
db = client["philosophy_club"]

GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID",
    "256483321761-a4hsvv36hbeslq1l3vjm0souh7988fir.apps.googleusercontent.com"
)

print("\n╔════════════════════════════════════════╗")
print("║  Philosophy Club Backend Starting...  ║")
print("╚════════════════════════════════════════╝\n")

try:
    # Test MongoDB connection
    client.admin.command('ping')
    print("[✓] MongoDB connected successfully")
except Exception as e:
    print(f"[✗] MongoDB connection error: {e}")
    raise

# ============= Helper Functions =============

def verify_google_token(token):
    """Verify Google JWT token and return user info"""
    try:
        idinfo = id_token.verify_oauth2_token(
            token, google_requests.Request(), GOOGLE_CLIENT_ID
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

# ============= Authentication Endpoints =============

@app.route("/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    """Google login endpoint"""
    try:
        data = request.get_json()
        token = data.get("token")
        
        if not token:
            return jsonify({"error": "Missing token"}), 400
        
        # Verify token with Google and extract user info
        email, name = verify_google_token(token)
        if not email:
            return jsonify({"error": "Invalid token"}), 401
        
        users = db["users"]
        
        # Check if user exists
        existing_user = users.find_one({"email": email})
        
        if existing_user:
            # User already exists
            return jsonify({
                "email": email,
                "name": existing_user.get("name"),
                "role": existing_user["role"]
            }), 200
        
        # New user - first user is admin
        user_count = users.count_documents({})
        role = "admin" if user_count == 0 else "user"
        
        # Create user
        users.insert_one({
            "email": email,
            "name": name,
            "role": role,
            "created_at": datetime.utcnow().isoformat()
        })
        
        message = "First user - admin created!" if role == "admin" else "User created"
        return jsonify({
            "email": email,
            "name": name,
            "role": role,
            "message": message
        }), 200
    
    except Exception as e:
        print(f"[!] Login error: {e}")
        return jsonify({"error": "Login failed"}), 500


# ============= User Management Endpoints =============

@app.route("/users", methods=["GET"])
@require_auth
def list_users():
    """List all users"""
    try:
        users = db["users"]
        user_list = list(users.find({}, {"_id": 0, "email": 1, "name": 1, "role": 1}))
        return jsonify(user_list), 200
    except Exception as e:
        print(f"[!] List users error: {e}")
        return jsonify({"error": "Failed to list users"}), 500

# ============= Bottles Management Endpoints =============

@app.route("/bottles", methods=["GET"])
@require_auth
def get_bottles():
    """Get all bottles from clubWhiskies collection"""
    try:
        bottles_collection = db["clubWhiskies"]
        bottles_cursor = bottles_collection.find({})
        
        bottles = []
        for bottle in bottles_cursor:
            # Map MongoDB schema to frontend expected format
            bottles.append({
                "name": bottle.get("name", ""),
                "distillery": bottle.get("name", "").split()[0],  # Extract first word as distillery
                "age": bottle.get("age", "Not stated"),
                "abv": bottle.get("strength", "N/A")
            })
        
        return jsonify(bottles), 200
    except Exception as e:
        print(f"[!] Get bottles error: {e}")
        return jsonify({"error": "Failed to fetch bottles"}), 500

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
    print(f"[✓] Backend ready! Visit http://127.0.0.1:{port}/health\n")
    app.run(host="0.0.0.0", port=port, debug=False)
