cd agents
poetry run adk web --allow_origins http://localhost:5173 --session_service_uri sqlite://./.local-state/agent_session_service_db.sqlite3 --logo-text "Gefifi Agents" --logo-image-url "https://gefifi.at0.app/icons/icon-144x144.png"
