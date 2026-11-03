from slowapi import Limiter
from slowapi.util import get_remote_address #built-in function from slowapi that extracts the IP address of whoever is making the request

limiter = Limiter(key_func=get_remote_address, default_limits=[]) #to create limiter object in the app
#default_limits=[] if router has no @limit will has no limit 