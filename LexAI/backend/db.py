from dotenv import load_dotenv
load_dotenv()

import os
from pymongo import MongoClient

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "lexai_db")

client = MongoClient(MONGODB_URI)
db = client[MONGODB_DB]
