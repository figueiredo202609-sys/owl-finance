import os, bcrypt
from pymongo import MongoClient
with open('/app/backend/.env') as f:
    for line in f:
        line=line.strip()
        if '=' in line and not line.startswith('#'):
            k,v=line.split('=',1)
            os.environ[k]=v.strip('"')

client = MongoClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
pwd = b'Client123!'
hashed = bcrypt.hashpw(pwd, bcrypt.gensalt()).decode()
result = db.users.update_one({'email':'owltest@test.com'},{'$set':{'password_hash':hashed}})
print('Modified:', result.modified_count)
