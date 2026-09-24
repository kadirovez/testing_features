import os

os.environ.setdefault("JWT_SECRET", "test-secret-with-enough-length-for-hs256")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
if "TEST_DATABASE_URL" in os.environ:
    os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]
