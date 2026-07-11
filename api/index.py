import sys
import os

# Make backend/ importable from the repo root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.server import app  # noqa: E402
from mangum import Mangum

# Vercel calls this handler for every request
handler = Mangum(app, lifespan="off")
