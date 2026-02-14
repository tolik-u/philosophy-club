from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv
import json
import base64

# ============= Setup =============

load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB setup
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://127.0.0.1:27017")
client = MongoClient(MONGODB_URL)
db = client["philosophy_club"]

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

def extract_email_from_token(token):
    """Extract email from Google JWT token"""
    try:
        # Split the token
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        # Decode the payload (add padding if needed)
        payload = parts[1]
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += '=' * padding
        
        # Base64 decode
        decoded = base64.urlsafe_b64decode(payload)
        payload_json = json.loads(decoded)
        
        return payload_json.get("email")
    except Exception as e:
        print(f"[!] Error extracting email from token: {e}")
        return None

def extract_user_info_from_token(token):
    """Extract email and name from Google JWT token"""
    try:
        # Split the token
        parts = token.split('.')
        if len(parts) != 3:
            return None, None
        
        # Decode the payload (add padding if needed)
        payload = parts[1]
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += '=' * padding
        
        # Base64 decode
        decoded = base64.urlsafe_b64decode(payload)
        payload_json = json.loads(decoded)
        
        return payload_json.get("email"), payload_json.get("name")
    except Exception as e:
        print(f"[!] Error extracting user info from token: {e}")
        return None, None

# ============= Authentication Endpoints =============

@app.route("/login", methods=["POST"])
def login():
    """Google login endpoint"""
    try:
        data = request.get_json()
        token = data.get("token")
        
        if not token:
            return jsonify({"error": "Missing token"}), 400
        
        # Extract email and name from token
        email, name = extract_user_info_from_token(token)
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
    print("[*] Binding to 127.0.0.1:8080...")
    print("[✓] Backend ready! Visit http://127.0.0.1:8080/health\n")
    app.run(host="127.0.0.1", port=8080, debug=False)
