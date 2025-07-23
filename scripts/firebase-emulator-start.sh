# firebase emulators:start --project gefifi-demo-app --only functions,firestore,storage

# firebase emulators:start --only functions,auth --project gefifi-demo-app

# GOOGLE_APPLICATION_CREDENTIALS="functions/gcp-credentials.json" firebase emulators:start --only auth,functions,firestore,storage

GOOGLE_APPLICATION_CREDENTIALS="${PWD}/functions/gcp-credentials.json" firebase emulators:start --only auth,functions,firestore,storage
