#!/usr/bin/env python3
"""Reset all geo tables to empty state."""
import os
from dotenv import load_dotenv
import requests

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_SERVICE_ROLE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

HEADERS = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
}

def delete_all(table):
    url = f'{SUPABASE_URL}/rest/v1/{table}?id=not.is.null'
    resp = requests.delete(url, headers=HEADERS, timeout=30)
    if resp.status_code in (200, 204):
        print(f'  {table}: cleared')
        return True
    print(f'  {table}: error {resp.status_code}')
    return False

print('================================================')
print('Resetting all geo tables to empty state')
print('================================================\n')

ok = True
for table in ['geo_gram_panchayats', 'geo_blocks', 'geo_districts', 'geo_states']:
    ok = delete_all(table) and ok

print('\n' + '=' * 50)
if ok:
    print('All geo tables reset.')
else:
    print('Reset finished with errors. Check output above.')
print('=' * 50)
