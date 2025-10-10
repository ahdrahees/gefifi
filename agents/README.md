# Build Assist Agent - Construction Management AI

An AI agent built with Google ADK (Agent Development Kit) to assist with construction project management, including file uploads, material requests, work requests, and contract management.

## 🚀 Quick Start

```bash
# Install dependencies
poetry install

# Configure environment
echo "BACKEND_URL=http://localhost:3000" > .env

# Run locally
poetry run adk deploy --local
```

## 📁 Project Structure

```
agents/
├── build_assist_agent/
│   ├── __init__.py
│   ├── agent.py          # Main agent configuration
│   ├── config.py         # Environment configuration
│   └── tools.py          # File upload and backend integration tools
├── pyproject.toml        # Python dependencies
├── poetry.lock
├── .env                  # Environment variables (create this)
├── README.md            # This file
├── QUICK_START.md       # Quick start guide
├── FILE_UPLOAD_GUIDE.md # Detailed file upload documentation
└── EXAMPLE_USAGE.py     # Code examples
```

## 🎯 Features

### Current Features

- ✅ Weather information retrieval
- ✅ Time zone information
- ✅ **File upload to Material Requests**
- ✅ **File upload to Work Requests**
- ✅ **File upload to Contracts**
- ✅ **File analysis and validation**
- ✅ Backend integration with authentication

### Planned Features

- 🔄 Create and manage material requests
- 🔄 Create and manage work requests
- 🔄 Contract creation and management
- 🔄 Project status tracking
- 🔄 Real-time notifications
- 🔄 Advanced file processing (OCR, image analysis)

## 🔧 Configuration

### Environment Variables

Create `agents/.env`:

```bash
# Required
BACKEND_URL=http://localhost:3000

# Optional (for production)
# BACKEND_URL=https://your-backend.com
```

### Dependencies

```toml
[project.dependencies]
google-adk = ">=1.15.1,<2.0.0"
litellm = ">=1.77.7,<2.0.0"
python-dotenv = ">=1.0.0,<2.0.0"
requests = ">=2.31.0,<3.0.0"
```

## 📤 File Upload Usage

### How File Uploads Work

1. **User uploads files** through ADK web interface
2. **ADK converts** files to `Artifact` objects
3. **Agent receives** artifacts in tool parameters
4. **Tools process** and upload to backend API
5. **Backend saves** to Google Cloud Storage
6. **Firestore updated** with file metadata

### Basic Example

```python
# User uploads files via ADK web interface
# Agent automatically receives them as Artifacts

from build_assist_agent.tools import upload_material_request_attachments

result = upload_material_request_attachments(
    material_request_id="MR-001",
    files=artifacts,  # Provided by ADK
    auth_token=user_token
)

if result["status"] == "success":
    print("✅ Upload successful!")
else:
    print(f"❌ Upload failed: {result['message']}")
```

### Available Tools

#### 1. `upload_material_request_attachments`

Upload files to a material request.

**Parameters:**

- `material_request_id` (str): Material request ID
- `files` (List[Artifact]): Files to upload
- `auth_token` (str): User's JWT token

**Returns:** Status dict with success/error message

#### 2. `upload_work_request_attachments`

Upload files to a work request.

Same parameters and return format as material requests.

#### 3. `upload_contract_attachments`

Upload files to a contract.

Same parameters and return format as material requests.

#### 4. `analyze_uploaded_file`

Analyze file properties without uploading.

**Parameters:**

- `file` (Artifact): Single file to analyze

**Returns:** File information (name, size, type, preview)

## 🎨 Example Conversations

### Example 1: Upload Blueprints

```
User: "I need to upload blueprints to material request MR-001"

Agent: "Sure! Please upload your blueprint files."

[User uploads 2 PDF files]

Agent: "I've received 2 files:
- blueprint_floor1.pdf (2.3 MB)
- blueprint_floor2.pdf (1.8 MB)

Uploading to MR-001..."

Agent: "✅ Successfully uploaded 2 blueprints to MR-001!"
```

### Example 2: Upload Site Photos

```
User: "Add these photos to work request WR-005"

[User uploads 5 JPG images]

Agent: "Analyzing photos...
- photo1.jpg (Image, 4.2 MB)
- photo2.jpg (Image, 3.8 MB)
- photo3.jpg (Image, 5.1 MB)
- photo4.jpg (Image, 3.2 MB)
- photo5.jpg (Image, 4.5 MB)

Total: 20.8 MB

Uploading to WR-005..."

Agent: "📸 Successfully uploaded 5 photos!"
```

### Example 3: Contract Documents

```
User: "Upload contract documents to CT-007"

[User uploads 1 PDF and 1 DOCX]

Agent: "Validating documents...
✓ contract_v2.pdf (PDF, 856 KB)
✓ terms_and_conditions.docx (Word, 124 KB)

Uploading to contract CT-007..."

Agent: "📄 Contract documents uploaded successfully!"
```

## 🔒 Authentication

All upload operations require a valid JWT token from your backend authentication system. The token should be passed to upload functions:

```python
# Get token from user session/context
auth_token = get_user_auth_token()

# Use in upload
result = upload_material_request_attachments(
    material_request_id="MR-001",
    files=files,
    auth_token=auth_token
)
```

## 📊 Backend Integration

### API Endpoints

Your agent connects to these backend endpoints:

```
POST /attachments/material-requests/:id
POST /attachments/work-requests/:id
POST /attachments/contracts/:id
```

### Request Format

- **Method:** POST
- **Content-Type:** multipart/form-data
- **Headers:** `Authorization: Bearer <token>`
- **Body:** Files with field name `files`

### Response Format

```json
{
	"message": "2 attachment(s) uploaded successfully!",
	"attachments": [
		{
			"fileName": "blueprint.pdf",
			"filePath": "material-requests/MR-001/blueprint.pdf",
			"fileType": "application/pdf",
			"size": 123456
		}
	],
	"totalAttachments": 2
}
```

## 🚫 Validation & Limits

- **Max file size:** 25 MB per file
- **Max files per request:** 20 files
- **Supported file types:**
  - PDFs (.pdf)
  - Images (.jpg, .jpeg, .png, .gif, .webp)
  - Documents (.doc, .docx)
  - Spreadsheets (.xls, .xlsx)
  - Text files (.txt)
  - And more (see backend middleware)

## ⚠️ Error Handling

Common errors and their meanings:

| Error                   | Meaning               | Solution               |
| ----------------------- | --------------------- | ---------------------- |
| `No files provided`     | No files in upload    | Upload files first     |
| `401 Unauthorized`      | Invalid/expired token | Re-authenticate        |
| `403 Forbidden`         | No permission         | Check user permissions |
| `404 Not Found`         | Entity doesn't exist  | Verify entity ID       |
| `File too large`        | Exceeds 25MB limit    | Compress or split file |
| `File type not allowed` | Unsupported type      | Use allowed file types |
| `Too many files`        | More than 20 files    | Upload in batches      |

## 🧪 Testing

### Local Development

1. **Start backend:**

   ```bash
   cd backend
   npm run dev
   ```

2. **Start Firebase emulators:**

   ```bash
   firebase emulators:start
   ```

3. **Deploy agent locally:**

   ```bash
   cd agents
   poetry run adk deploy --local
   ```

4. **Test in browser:**
   - Open ADK web interface
   - Upload test files
   - Interact with agent

### Test Scenarios

- ✅ Single file upload
- ✅ Multiple files (2-5)
- ✅ Large file (close to 25MB)
- ✅ Invalid file type
- ✅ Too many files (>20)
- ✅ Invalid entity ID
- ✅ Unauthorized access
- ✅ Text file analysis

## 📚 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Get started quickly
- **[FILE_UPLOAD_GUIDE.md](./FILE_UPLOAD_GUIDE.md)** - Detailed file upload docs
- **[EXAMPLE_USAGE.py](./EXAMPLE_USAGE.py)** - Code examples

## 🏗️ Architecture

```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │ Upload Files
       ↓
┌─────────────┐
│  ADK Web    │
│  Interface  │
└──────┬──────┘
       │ Artifacts
       ↓
┌─────────────┐
│  ADK Agent  │
│   (Python)  │
└──────┬──────┘
       │ HTTP POST
       ↓
┌─────────────┐
│  Backend    │
│  (Node.js)  │
└──────┬──────┘
       │ Upload
       ↓
┌─────────────┐
│   Google    │
│   Cloud     │
│  Storage    │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Firestore  │
│  (Metadata) │
└─────────────┘
```

## 🤝 Contributing

When adding new features:

1. Add tool functions to `tools.py`
2. Import and register in `agent.py`
3. Document in appropriate .md files
4. Add examples to `EXAMPLE_USAGE.py`
5. Test thoroughly

## 📝 License

[Your License Here]

## 🐛 Troubleshooting

### "No module named 'google.adk'"

**Solution:** Install dependencies

```bash
poetry install
```

### "Connection refused" when uploading

**Solution:** Ensure backend is running

```bash
cd backend
npm run dev
```

### "BACKEND_URL not set"

**Solution:** Create `.env` file

```bash
echo "BACKEND_URL=http://localhost:3000" > agents/.env
```

### Files not uploading

**Checklist:**

1. ✅ Backend running?
2. ✅ Firebase emulators running?
3. ✅ Valid auth token?
4. ✅ Entity exists?
5. ✅ User has permission?
6. ✅ File size < 25MB?
7. ✅ Correct file type?

## 📞 Support

For issues or questions:

1. Check documentation files
2. Review example code
3. Check backend logs
4. Verify environment configuration

## 🎯 Next Steps

1. ✅ Install and configure agent
2. ✅ Test file upload locally
3. 🔄 Add authentication context handling
4. 🔄 Implement material request creation
5. 🔄 Implement work request creation
6. 🔄 Add project management features
7. 🔄 Deploy to production

---

**Built with [Google ADK](https://developers.google.com/adk) and ❤️**
