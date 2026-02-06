import bcrypt

def get_password_hash(password):
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password, hashed_password):
    password_byte_enc = plain_password.encode('utf-8')
    # Check if hashed_password is bytes or string, ensure bytes for checkpw
    if isinstance(hashed_password, str):
        hashed_password_byte_enc = hashed_password.encode('utf-8')
    else:
        hashed_password_byte_enc = hashed_password
        
    return bcrypt.checkpw(password_byte_enc, hashed_password_byte_enc)
