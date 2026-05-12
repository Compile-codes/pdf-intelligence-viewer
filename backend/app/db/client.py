import asyncpg
from pgvector.asyncpg import register_vector
import os
from dotenv import load_dotenv

load_dotenv()

_pool = None

async def get_pool():
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            os.environ["DATABASE_URL"],
            init=register_vector
        )
    return _pool
