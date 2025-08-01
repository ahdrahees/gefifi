# firebase emulators:start --project gefifi-demo-app --only functions,firestore,storage

# firebase emulators:start --only functions,auth --project gefifi-demo-app

# GOO

# Start the emulators without data persistence
# GOOGLE_APPLICATION_CREDENTIALS="${PWD}/functions/gcp-credentials.json" firebase emulators:start --only auth,functions,firestore,storage


# To persist data in the Firebase emulators, you can use the following command:
GOOGLE_APPLICATION_CREDENTIALS="${PWD}/functions/gcp-credentials.json" firebase emulators:start --only auth,functions,firestore,storage --export-on-exit .emulator-persisted-data --import .emulator-persisted-data