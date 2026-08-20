"""
Configuração do Supabase para o SkillBridge
"""

import os
from supabase import create_client  # type: ignore[import]

SUPABASE_URL = os.environ.get('VITE_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('VITE_SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(
        "VITE_SUPABASE_URL e VITE_SUPABASE_KEY devem estar definidas no .env"
    )

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)