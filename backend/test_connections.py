import asyncio
import sys
import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine("postgresql+asyncpg://postgres:password@localhost:5432/vishleshan", pool_pre_ping=True)
async def test_all():
    print('Testing DB...')
    try:
        async with engine.connect() as conn:
            print('DB connection SUCCESS')
    except Exception as e:
        print(f'DB connection FAILED: {e}')
        sys.exit(1)
        
    print('Testing Redis...')
    try:
        redis = aioredis.from_url("redis://localhost:6379")
        await redis.ping()
        print('Redis connection SUCCESS')
    except Exception as e:
        print(f'Redis connection FAILED: {e}')
        sys.exit(1)

asyncio.run(test_all())
