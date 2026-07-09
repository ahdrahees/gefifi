// gefifi-2/src/frontend/src/lib/components/help/HelpContent.ts

export type HelpSection = {
    id: string;
    title: string;
    content: string;
    userTypes: ('customer' | 'expert' | 'supplier')[];
    links?: { text: string; url: string }[];
    expanded: boolean;
};

export type HelpContent = {
    sections: HelpSection[];
};

// English help content
export const englishHelpContent: HelpContent = {
    sections: [
        // CUSTOMER HELP SECTIONS
        {
            id: 'customer-getting-started',
            title: 'Getting Started as a Customer',
            content: `Welcome to GEFIFI! As a customer, you can post work requests to find skilled experts and material requests to get quotes from suppliers.

**Step 1: Complete your profile**
Add your name, location, and contact details. Upload a profile photo for better trust.

**Step 2: Post your first request**
Choose between Work Request (for hiring experts) or Material Request (for buying materials). Fill in detailed requirements and specifications.

**Step 3: Review interested professionals**
Experts and suppliers will express interest in your requests. Review their profiles, experience, and ratings.

**Step 4: Create contracts**
Formalize agreements with selected professionals. Set clear terms, timelines, and payment schedules.

**Step 5: Track your projects**
Monitor progress through our project management system. Communicate with professionals via chat.`,
            userTypes: ['customer'],
            links: [
                { text: 'Create New Request', url: '/customer/create-request' },
                { text: 'View My Requests', url: '/my-requests' },
                { text: 'Edit Profile', url: '/profile' }
            ],
            expanded: false
        },
        {
            id: 'customer-work-requests',
            title: 'How to Post a Work Request',
            content: `Work requests help you find skilled experts like plumbers, electricians, masons, and contractors for your construction projects.

**Step-by-step process:**

**1. Navigate to Create Request**
Go to "Create Request" and select "Work Request". You'll see the work request creation form.

**2. Fill in project details:**
- **Title**: Brief summary (e.g., "Bathroom Renovation", "Kitchen Remodeling")
- **Category**: Select from 11+ categories (Plumbing, Electrical, Masonry, etc.)
- **Description**: Detailed project requirements and specifications
- **Location**: Where the work will be performed
- **Expected Cost**: Your budget estimate (optional but helpful)
- **Timeline**: When you need the work completed
- **Materials Suggested**: Any specific material requirements

**3. Upload images**
Add photos of the work area or reference images. Supported formats: JPEG, PNG, GIF, WebP. Maximum 10 images per request, each up to 10MB.

**4. Submit your request**
Review all details before submitting. Your request will be visible to experts in your area.

**After posting:**
Experts can express interest in your project. You can invite specific experts you find. Review interested experts' profiles and start conversations through chat.`,
            userTypes: ['customer'],
            links: [
                { text: 'Create Work Request', url: '/customer/create-work-request' },
                { text: 'Browse Work Requests', url: '/work-requests' },
                { text: 'Find Experts', url: '/find-professionals?type=expert' }
            ],
            expanded: false
        },
        {
            id: 'customer-material-requests',
            title: 'How to Post a Material Request',
            content: `Material requests help you get quotes from suppliers for construction materials and supplies.

**Step-by-step process:**

**1. Navigate to Create Request**
Go to "Create Request" and select "Material Request". Access the material request creation form.

**2. Fill in material details:**
- **Title**: Brief description (e.g., "Cement and Steel for Foundation")
- **Description**: Detailed material requirements and specifications
- **Delivery Location**: Where materials should be delivered
- **Delivery Date**: When you need the materials (optional)
- **Link to Work Request**: Connect to existing project (optional)

**3. Add material items:**
For each material you need:
- **Item name**: (e.g., "Cement bags", "Steel rods", "Paint buckets")
- **Quantity**: (e.g., "50 bags", "2 tons", "500 ft")
- **Notes/specifications**: (e.g., "Grade 43", "10mm diameter", "Weather resistant")

**4. Upload documents**
Add specifications, drawings, or reference files. Supported file types: PDF, Word, Excel, Images, CAD files (DWG, DXF). Maximum 25MB per file, up to 20 files per request.

**5. Submit your request**
Review all details and attachments. Suppliers will receive your request and can provide quotes.`,
            userTypes: ['customer'],
            links: [
                { text: 'Create Material Request', url: '/customer/create-material-request' },
                { text: 'Browse Material Requests', url: '/material-requests' },
                { text: 'Find Suppliers', url: '/find-professionals?type=supplier' }
            ],
            expanded: false
        },
        {
            id: 'customer-contract-conditions',
            title: 'When Can You Create Contracts and What Are the Conditions?',
            content: `Understanding when and how you can create contracts is essential for successful project management.

**When can customers create contracts?**
- After experts or suppliers express interest in your requests
- When you want to hire someone who showed interest in your project
- Only with professionals who are in your request's interested or invited lists
- For both work requests (expert contracts) and material requests (material contracts)

**Required conditions for contract creation:**
- **Authorization**: You must be the customer who posted the request
- **Professional interest**: The expert/supplier must have expressed interest or been invited
- **Request status**: Your request should be in an appropriate status (typically 'open' or 'in_discussion')
- **Active participants**: Both you and the professional must have active accounts

**Contract creation process:**
1. **Navigate to interested professionals**: Go to your request details page
2. **Review interested parties**: Check the list of experts/suppliers who expressed interest
3. **Select a professional**: Click "Create Contract" next to their profile
4. **Fill contract details**: Complete all required fields including work scope, timeline, and payment terms
5. **Submit for signatures**: Both parties must sign to activate the contract`,
            userTypes: ['customer'],
            links: [
                { text: 'View My Requests', url: '/my-requests' },
                { text: 'Create New Request', url: '/customer/create-request' },
                { text: 'My Contracts', url: '/contracts' }
            ],
            expanded: false
        },
        {
            id: 'expert-getting-started',
            title: 'Getting Started as an Expert',
            content: `Welcome to GEFIFI! As an expert, you can find construction projects and connect with customers who need your skills.

**First steps:**

**1. Complete your profile**
Add your expertise, experience, and location. Choose from categories like Plumbing, Electrical, Masonry, Carpentry, Interior Design, General Construction, and more.

**2. Browse work requests**
Find projects that match your skills. Filter by location, category, and budget.

**3. Express interest**
Show customers you're available for their projects. Send personalized messages explaining your relevant experience.

**4. Chat with customers**
Discuss project details and requirements. Answer questions and provide professional advice.

**5. Create contracts**
Formalize agreements for selected projects. Set clear terms, timelines, and payment schedules.`,
            userTypes: ['expert'],
            links: [
                { text: 'Browse Work Requests', url: '/work-requests' },
                { text: 'Edit Profile', url: '/profile' }
            ],
            expanded: false
        },
        {
            id: 'supplier-getting-started',
            title: 'Getting Started as a Supplier',
            content: `Welcome to GEFIFI! As a supplier, you can provide construction materials and supplies to customers and contractors.

**First steps:**

**1. Complete your profile**
Add company name, material categories, and location. Choose from categories like Cement & Steel, Paints & Finishes, Electrical Supplies, Plumbing Materials, Tools & Equipment, and more.

**2. Browse material requests**
Find customers needing your products. Filter by material type, location, and delivery requirements.

**3. Express interest**
Show customers you can fulfill their requirements. Provide detailed quotes with competitive pricing.

**4. Provide quotes**
Offer competitive pricing and delivery terms. Include quality information and certifications.

**5. Create contracts**
Formalize supply agreements. Set clear delivery terms, payment schedules, and quality standards.`,
            userTypes: ['supplier'],
            links: [
                { text: 'Browse Material Requests', url: '/material-requests' },
                { text: 'Edit Profile', url: '/profile' }
            ],
            expanded: false
        },
        {
            id: 'chat-communication',
            title: 'Using the Chat System',
            content: `GEFIFI's chat system enables real-time communication between customers, experts, and suppliers.

**Chat features:**
- **Text messages**: Send and receive instant messages
- **Voice messages**: Record and send audio messages (up to 5 minutes)
- **Image sharing**: Share photos, documents, and files
- **Typing indicators**: See when others are typing
- **Online status**: Know when participants are available
- **Message history**: Access complete conversation history

**How to start a chat:**
1. **Express interest**: Automatically creates a chat with the customer
2. **From profiles**: Send interest from professional profiles
3. **Contract discussions**: Chats are created for each contract

**Voice messages:**
Press and hold the microphone button to record. Listen to your recording before sending. Release to send, or swipe to cancel.`,
            userTypes: ['customer', 'expert', 'supplier'],
            links: [{ text: 'Open Chat', url: '/chat' }],
            expanded: false
        },
        {
            id: 'profile-management',
            title: 'Managing Your Profile',
            content: `Your profile is crucial for building trust and attracting the right opportunities.

**Profile sections:**
- **Basic information**: Name, email, location, phone number
- **Professional details**: Experience, expertise/category
- **Profile photo**: Upload a professional avatar image
- **Company information**: For suppliers, add company details

**For customers:**
- **Full name**: Your name for communications
- **Location**: Your project location area
- **Contact**: Phone number for urgent communications

**For experts:**
- **Expertise**: Your specialization (Plumbing, Electrical, etc.)
- **Experience**: Years in the construction industry
- **Service area**: Locations where you work

**For suppliers:**
- **Company name**: Your business name
- **Category**: Types of materials you supply
- **Supply area**: Delivery locations you serve

**Profile photo guidelines:**
Professional appearance with clear, high-quality image. Supported formats: JPEG, PNG, GIF, WebP, SVG. Maximum 2MB file size. Square images work best.

**Why complete your profile:**
Complete profiles get more responses, help with better matching, and show you're serious about your business.`,
            userTypes: ['customer', 'expert', 'supplier'],
            links: [{ text: 'Edit Profile', url: '/profile' }],
            expanded: false
        },
        {
            id: 'troubleshooting',
            title: 'Troubleshooting Common Issues',
            content: `Solutions to common problems and technical issues.

**Login and account issues:**
- **Forgot password**: Use the password reset option on login page
- **Account locked**: Contact support if you can't access your account
- **Profile updates**: Refresh the page if changes don't appear immediately
- **Session expired**: Log out and log back in if you see authentication errors

**File upload issues:**
- **Large files**: Ensure files are under size limits (2MB for avatars, 25MB for documents)
- **Unsupported formats**: Check that file types are supported
- **Upload failures**: Try refreshing the page and uploading again
- **Image previews**: Clear browser cache if images don't display properly

**Chat and messaging:**
- **Messages not sending**: Check your internet connection
- **Voice messages not playing**: Ensure browser has media permissions
- **File sharing failures**: Verify file size and format requirements
- **Connection issues**: Refresh the page or restart your browser

**Performance issues:**
- **Slow loading**: Clear browser cache and cookies
- **Browser compatibility**: Use updated versions of Chrome, Firefox, or Safari
- **Mobile issues**: Try the desktop version for full functionality
- **Offline access**: Some features require internet connection

**When to contact support:**
Contact support for payment issues, account verification problems, persistent technical bugs, or if this help section doesn't answer your question.`,
            userTypes: ['customer', 'expert', 'supplier'],
            links: [{ text: 'Contact Support', url: '#contact-support' }],
            expanded: false
        }
    ]
};

// Hindi help content
export const hindiHelpContent: HelpContent = {
    sections: [
        {
            id: 'customer-getting-started-hi',
            title: 'Customer के रूप में शुरुआत करना',
            content: `GEFIFI में आपका स्वागत है! Customer के रूप में, आप कुशल experts को खोजने के लिए work requests पोस्ट कर सकते हैं और suppliers से quotes पाने के लिए material requests बना सकते हैं।

**Step 1: अपना profile पूरा करें**
अपना नाम, स्थान और संपर्क विवरण जोड़ें। बेहतर विश्वास के लिए profile photo अपलोड करें।

**Step 2: अपना पहला request पोस्ट करें**
Work Request (experts को hire करने के लिए) या Material Request (materials खरीदने के लिए) के बीच चुनें। विस्तृत आवश्यकताओं और specifications भरें।

**Step 3: Interested professionals की समीक्षा करें**
Experts और suppliers आपके requests में interest दिखाएंगे। उनके profiles, experience और ratings की समीक्षा करें।

**Step 4: Contracts बनाएं**
चुने गए professionals के साथ agreements को formalize करें। स्पष्ट terms, timelines और payment schedules सेट करें।

**Step 5: अपने projects को track करें**
हमारे project management system के माध्यम से progress monitor करें। Chat के माध्यम से professionals के साथ communicate करें।`,
            userTypes: ['customer'],
            links: [
                { text: 'Create New Request', url: '/customer/create-request' },
                { text: 'View My Requests', url: '/my-requests' },
                { text: 'Edit Profile', url: '/profile' }
            ],
            expanded: false
        },
        {
            id: 'customer-work-requests-hi',
            title: 'Work Request कैसे पोस्ट करें',
            content: `Work requests आपको अपने construction projects के लिए plumbers, electricians, masons और contractors जैसे कुशल experts खोजने में मदद करते हैं।

**Step-by-step प्रक्रिया:**

**1. Create Request पर जाएं**
"Create Request" पर जाएं और "Work Request" select करें। आपको work request creation form दिखेगा।

**2. Project details भरें:**
- **Title**: संक्षिप्त सारांश (जैसे, "Bathroom Renovation", "Kitchen Remodeling")
- **Category**: 11+ categories में से select करें (Plumbing, Electrical, Masonry, आदि)
- **Description**: विस्तृत project requirements और specifications
- **Location**: जहाँ काम किया जाना है
- **Expected Cost**: आपका budget estimate (optional लेकिन helpful)
- **Timeline**: कब तक काम पूरा होना चाहिए
- **Materials Suggested**: कोई specific material requirements

**3. Images upload करें**
Work area की photos या reference images जोड़ें। Supported formats: JPEG, PNG, GIF, WebP। Maximum 10 images per request, प्रत्येक 10MB तक।

**4. अपना request submit करें**
Submit करने से पहले सभी details की review करें। आपका request आपके area के experts को दिखेगा।

**Post करने के बाद:**
Experts आपके project में interest दिखा सकते हैं। आप specific experts को invite कर सकते हैं। Review interested experts' profiles and start conversations through chat.`,
            userTypes: ['customer'],
            links: [
                { text: 'Create Work Request', url: '/customer/create-work-request' },
                { text: 'Browse Work Requests', url: '/work-requests' },
                { text: 'Find Experts', url: '/find-professionals?type=expert' }
            ],
            expanded: false
        },
        {
            id: 'customer-material-requests-hi',
            title: 'Material Request कैसे पोस्ट करें',
            content: `Material requests आपको construction materials और supplies के लिए suppliers से quotes प्राप्त करने में मदद करते हैं।

**Step-by-step प्रक्रिया:**

**1. Create Request पर जाएं**
"Create Request" पर जाएं और "Material Request" चुनें। material request creation form तक पहुंचें।

**2. Material details भरें:**
- **Title**: संक्षिप्त विवरण (जैसे, "Cement and Steel for Foundation")
- **Description**: विस्तृत material requirements और specifications
- **Delivery Location**: जहां materials deliver किए जाने हैं
- **Delivery Date**: जब आपको materials चाहिए (optional)
- **Link to Work Request**: मौजूदा project से connect करें (optional)

**3. Material items जोड़ें:**
आपको आवश्यक प्रत्येक material के लिए:
- **Item name**: (जैसे, "Cement bags", "Steel rods", "Paint buckets")
- **Quantity**: (जैसे, "50 bags", "2 tons", "500 ft")
- **Notes/specifications**: (जैसे, "Grade 43", "10mm diameter", "Weather resistant")

**4. Documents upload करें**
Add specifications, drawings, या reference files जोड़ें। Supported file types: PDF, Word, Excel, Images, CAD files (DWG, DXF). Maximum 25MB per file, 20 files per request तक।

**5. अपना request submit करें**
सभी details और attachments की review करें। Suppliers को आपका request मिलेगा और वे quotes प्रदान कर सकते हैं।`,
            userTypes: ['customer'],
            links: [
                { text: 'Create Material Request', url: '/customer/create-material-request' },
                { text: 'Browse Material Requests', url: '/material-requests' },
                { text: 'Find Suppliers', url: '/find-professionals?type=supplier' }
            ],
            expanded: false
        },
        {
            id: 'customer-contract-conditions-hi',
            title: 'आप Contracts कब बना सकते हैं और शर्तें क्या हैं?',
            content: `Contracts कब और कैसे बना सकते हैं, यह समझना सफल project management के लिए आवश्यक है।

**Customers contracts कब बना सकते हैं?**
- Experts या suppliers आपके requests में interest दिखाने के बाद
- जब आप अपने project में interest दिखाने वाले किसी व्यक्ति को hire करना चाहते हैं
- केवल उन professionals के साथ जो आपके request के interested या invited lists में हैं
- Work requests (expert contracts) और material requests (material contracts) दोनों के लिए

**Contract बनाने के लिए आवश्यक शर्तें:**
- **Authorization**: आपको request पोस्ट करने वाला customer होना चाहिए
- **Professional interest**: वह व्यक्ति जो आपके request के interested या invited lists में है वह आपको अपने प्रोफ़ाइल पर देखने को देखना चाहिए
- **Request status**: आपका request उपयुक्त status में होना चाहिए (आमतौर पर 'open' या 'in_discussion')
- **Active participants**: आप और professional दोनों के active accounts होने चाहिए

**Contract बनाने की प्रक्रिया:**
1. **Navigate to interested professionals**: Go to your request details page
2. **Review interested parties**: Check the list of experts/suppliers who expressed interest
3. **Select a professional**: Click "Create Contract" next to their profile
4. **Fill contract details**: Complete all required fields including work scope, timeline, and payment terms
5. **Submit for signatures**: Both parties must sign to activate the contract`,
            userTypes: ['customer'],
            links: [
                { text: 'View My Requests', url: '/my-requests' },
                { text: 'Create New Request', url: '/customer/create-request' },
                { text: 'My Contracts', url: '/contracts' }
            ],
            expanded: false
        },
        {
            id: 'expert-getting-started-hi',
            title: 'Expert के रूप में शुरुआत करना',
            content: `GEFIFI में आपका स्वागत है! Expert के रूप में, आप construction projects ढूंढ सकते हैं और उन customers से जुड़ सकते हैं जिन्हें आपके कौशल की आवश्यकता है।

**पहले कदम:**

**1. अपनी profile पूरी करें**
अपनी expertise, experience और location जोड़ें। Plumbing, Electrical, Masonry, Carpentry, Interior Design, General Construction आदि जैसी categories में से चुनें।

**2. Work requests browse करें**
अपने कौशल से मेल खाने वाले projects ढूंढें। Location, category और budget के आधार पर filter करें।

**3. Interest व्यक्त करें**
Customers को दिखाएं कि आप उनके projects के लिए available हैं। अपने प्रासंगिक अनुभव की व्याख्या करते हुए personalized messages भेजें।

**4. Customers के साथ chat करें**
Project details और requirements पर चर्चा करें। सवालों के जवाब दें और पेशेवर सलाह दें।

**5. Contracts बनाएं**
चुने गए projects के लिए agreements को formalize करें। स्पष्ट terms, timelines और payment schedules सेट करें।`,
            userTypes: ['expert'],
            links: [
                { text: 'Browse Work Requests', url: '/work-requests' },
                { text: 'Edit Profile', url: '/profile' }
            ],
            expanded: false
        },
        {
            id: 'supplier-getting-started-hi',
            title: 'Supplier के रूप में शुरुआत करना',
            content: `GEFIFI में आपका स्वागत है! Supplier के रूप में, आप customers और contractors को construction materials और supplies प्रदान कर सकते हैं।

**पहले कदम:**

**1. अपनी profile पूरी करें**
Company का नाम, material categories और location जोड़ें। Cement & Steel, Paints & Finishes, Electrical Supplies, Plumbing Materials, Tools & Equipment आदि जैसी categories में से चुनें।

**2. Material requests browse करें**
अपने products की आवश्यकता वाले customers को ढूंढें। Material type, location और delivery requirements के आधार पर filter करें।

**3. Interest व्यक्त करें**
Customers को दिखाएं कि आप उनकी आवश्यकताओं को पूरा कर सकते हैं। प्रतिस्पर्धी मूल्य निर्धारण के साथ विस्तृत quotes प्रदान करें।

**4. Quotes प्रदान करें**
प्रतिस्पर्धी मूल्य निर्धारण और delivery terms प्रदान करें। गुणवत्ता की जानकारी और प्रमाणपत्र शामिल करें।

**5. Contracts बनाएं**
आपूर्ति समझौतों को formalize करें। स्पष्ट delivery terms, payment schedules और गुणवत्ता मानक निर्धारित करें।`,
            userTypes: ['supplier'],
            links: [
                { text: 'Browse Material Requests', url: '/material-requests' },
                { text: 'Edit Profile', url: '/profile' }
            ],
            expanded: false
        },
        {
            id: 'chat-communication-hi',
            title: 'Chat System का उपयोग करना',
            content: `GEFIFI का chat system customers, experts और suppliers के बीच real-time communication enable करता है।

**Chat features:**
- **Text messages**: Instant messages भेजें और प्राप्त करें
- **Voice messages**: Audio messages record करें और भेजें (5 minutes तक)
- **Image sharing**: Photos, documents और files share करें
- **Typing indicators**: देखें कि अन्य कब type कर रहे हैं
- **Online status**: जानें कि participants कब available हैं
- **Message history**: Complete conversation history access करें

**Chat कैसे शुरू करें:**
1. **Express interest**: Automatically customer के साथ chat create होता है
2. **Profiles से**: Professional profiles से interest भेजें
3. **Contract discussions**: प्रत्येक contract के लिए chats create होते हैं

**Voice messages:**
Record करने के लिए microphone button को press और hold करें। Send करने से पहले अपनी recording सुनें। Send करने के लिए release करें, या cancel करने के लिए swipe करें।`,
            userTypes: ['customer', 'expert', 'supplier'],
            links: [{ text: 'Open Chat', url: '/chat' }],
            expanded: false
        },
        {
            id: 'profile-management-hi',
            title: 'अपनी Profile प्रबंधित करना',
            content: `विश्वास बनाने और सही अवसर आकर्षित करने के लिए आपकी profile महत्वपूर्ण है।

**Profile sections:**
- **Basic information**: नाम, email, स्थान, फ़ोन नंबर
- **Professional details**: अनुभव, expertise/category
- **Profile photo**: एक पेशेवर avatar image अपलोड करें
- **Company information**: Suppliers के लिए, company विवरण जोड़ें

**Customers के लिए:**
- **Full name**: संचार के लिए आपका नाम
- **Location**: आपका project स्थान क्षेत्र
- **Contact**: तत्काल संचार के लिए फ़ोन नंबर

**Experts के लिए:**
- **Expertise**: आपकी विशेषज्ञता (Plumbing, Electrical, आदि)
- **Experience**: निर्माण उद्योग में वर्षों का अनुभव
- **Service area**: वे स्थान जहाँ आप काम करते हैं

**Suppliers के लिए:**
- **Company name**: आपका व्यवसाय नाम
- **Category**: आपके द्वारा आपूर्ति की जाने वाली सामग्रियों के प्रकार
- **Supply area**: आपके द्वारा सेवा प्रदान किए जाने वाले delivery स्थान

**Profile photo दिशानिर्देश:**
स्पष्ट, उच्च-गुणवत्ता वाली छवि के साथ पेशेवर उपस्थिति। Supported formats: JPEG, PNG, GIF, WebP, SVG. अधिकतम 2MB फ़ाइल आकार। Square images सबसे अच्छा काम करती हैं।

**अपनी profile क्यों पूरी करें:**
पूरी profiles को अधिक प्रतिक्रियाएं मिलती हैं, बेहतर मिलान में मदद मिलती है, और यह दिखाती है कि आप अपने व्यवसाय के प्रति गंभीर हैं।`,
            userTypes: ['customer', 'expert', 'supplier'],
            links: [{ text: 'Edit Profile', url: '/profile' }],
            expanded: false
        },
        {
            id: 'troubleshooting-hi',
            title: 'सामान्य समस्याओं का निवारण',
            content: `सामान्य समस्याओं और तकनीकी समस्याओं का समाधान।

**Login और account संबंधी समस्याएं:**
- **Forgot password**: उस पेज पर password reset विकल्प का उपयोग करें जो लॉगिन पेज पर है
- **Account locked**: यदि आप अपने account तक नहीं पहुंच पा रहे हैं तो support से संपर्क करें
- **Profile updates**: यदि परिवर्तन तुरंत दिखाई न दें तो पेज को refresh करें
- **Session expired**: यदि आपको authentication errors दिखाई दें तो log out करें और फिर से log in करें

**File upload संबंधी समस्याएं:**
- **Large files**: सुनिश्चित करें कि files आकार सीमा के अंतर्गत हैं (avatars के लिए 2MB, documents के लिए 25MB)
- **Unsupported formats**: जांचें कि file types supported हैं
- **Upload failures**: पेज को refresh करने और फिर से upload करने का प्रयास करें
- **Image previews**: यदि images ठीक से प्रदर्शित नहीं होती हैं तो browser cache साफ़ करें

**Chat और messaging:**
- **Messages नहीं भेजे जा रहे हैं**: अपना internet connection जांचें
- **Voice messages नहीं चल रहे हैं**: सुनिश्चित करें कि browser के पास media permissions हैं
- **File sharing failures**: file आकार और format आवश्यकताओं को सत्यापित करें
- **Connection issues**: पेज को refresh करें या अपना browser restart करें

**Performance संबंधी समस्याएं:**
- **Slow loading**: browser cache और cookies साफ़ करें
- **Browser compatibility**: Chrome, Firefox, या Safari के updated versions का उपयोग करें
- **Mobile issues**: पूर्ण कार्यक्षमता के लिए desktop version का प्रयास करें
- **Offline access**: कुछ सुविधाओं के लिए internet connection की आवश्यकता होती है

**Support से कब संपर्क करें:**
भुगतान संबंधी समस्याओं, खाता सत्यापन समस्याओं, लगातार तकनीकी बग्स, या यदि यह सहायता अनुभाग आपके प्रश्न का उत्तर नहीं देता है, तो support से संपर्क करें।`,
            userTypes: ['customer', 'expert', 'supplier'],
            links: [{ text: 'Contact Support', url: '#contact-support' }],
            expanded: false
        }
    ]
};

// Malayalam help content
export const malayalamHelpContent: HelpContent = {
    sections: [
        {
            id: 'customer-getting-started-ml',
            title: 'Customer ആയി ആരംഭിക്കുന്നു',
            content: `GEFIFI-ലേക്ക് സ്വാഗതം! Customer ആയി, നിങ്ങൾക്ക് വൈദഗ്ധ്യമുള്ള experts-നെ കണ്ടെത്താൻ work requests പോസ്റ്റ് ചെയ്യാനും suppliers-ൽ നിന്ന് quotes ലഭിക്കാൻ material requests സൃഷ്ടിക്കാനും കഴിയും।

**Step 1: നിങ്ങളുടെ profile പൂർത്തിയാക്കുക**
നിങ്ങളുടെ പേര്, സ്ഥലം, contact details ചേർക്കുക। മെച്ചപ്പെട്ട വിശ്വാസത്തിനായി profile photo അपलोड ചെയ്യുക।

**Step 2: നിങ്ങളുടെ ആദ്യത്തെ request പോസ്റ്റ് ചെയ്യുക**
Work Request (experts-നെ hire ചെയ്യാൻ) അല്ലെങ്കിൽ Material Request (materials വാങ്ങാൻ) തിരഞ്ഞെടുക്കുക। വിശദമായ requirements-ഉം specifications-ഉം പൂരിപ്പിക്കുക।

**Step 3: Interested professionals-നെ അവലോകനം ചെയ്യുക**
Experts-ഉം suppliers-ഉം നിങ്ങളുടെ requests-ൽ interest കാണിക്കും। അവരുടെ profiles, experience ഔറ്റം അവലോകനം ചെയ്യുക।

**Step 4: Contracts സൃഷ്ടിക്കുക**
തിരഞ്ഞെടുത്ത professionals-മായി agreements formalize ചെയ്യുക। വ്യക്തമായ terms, timelines ഔറ്റം payment schedules സെറ്റ് ചെയ്യുക।

**Step 5: നിങ്ങളുടെ projects track ചെയ്യുക**
ഞങ്ങളുടെ project management system വഴി progress monitor ചെയ്യുക। Chat വഴി professionals-മായി communicate ചെയ്യുക।`,
            userTypes: ['customer'],
            links: [
                { text: 'Create New Request', url: '/customer/create-request' },
                { text: 'View My Requests', url: '/my-requests' },
                { text: 'Edit Profile', url: '/profile' }
            ],
            expanded: false
        },
        {
            id: 'customer-work-requests-ml',
            title: 'Work Request എങ്ങനെ പോസ്റ്റ് ചെയ്യാം',
            content: `Work requests നിങ്ങളുടെ construction projects-നായി plumbers, electricians, masons, contractors പോലുള്ള വൈദഗ്ധ്യമുള്ള experts-നെ കണ്ടെത്താൻ സഹായിക്കുന്നു।

**Step-by-step പ്രക്രിയ:**

**1. Create Request പോകുക**
"Create Request" പോകുക ഔട്ട് "Work Request" തേര്ന്നെടുക്കുക। നിങ്ങൾക്ക് work request creation form കാണാം।

**2. Project details ഭര്ത്തിപ്പിക്കുക:**
- **Title**: ചുരുക്കിയ സംഗ്രഹം (ഉദാ., "Bathroom Renovation", "Kitchen Remodeling")
- **Category**: 11+ categories-ൽ നിന്ന് തേര്ന്നെടുക്കുക (Plumbing, Electrical, Masonry, മുതലായവ)
- **Description**: വിശദമായ project requirements മറ്റുമ്മയും specifications
- **Location**: ജോലി നടത്തേണ്ട സ്ഥലം
- **Expected Cost**: നിങ്ങളുടെ budget estimate (optional ആണെങ്കിലും helpful)
- **Timeline**: എപ്പോൾ ജോലി പൂർത്തിയാക്കണം
- **Materials Suggested**: എന്തെങ്കിലും specific material requirements

**3. Images upload ചെയ്യുക**
Work area-യുടെ photos അല്ലെങ്കിൽ reference images ചേർക്കുക। Supported formats: JPEG, PNG, GIF, WebP। Maximum 10 images per request, ഓരോന്നും 10MB വരെ.

**4. നിങ്ങളുടെ request submit ചെയ്യുക**
Submit ചെയ്യുന്നതിന് മുമ്പ് എല്ലാ details-ഉം review ചെയ്യുക। നിങ്ങളുടെ request നിങ്ങളുടെ area-യിലെ experts-നു കാണാൻ കഴിയും।

**Post ചെയ്തതിന് ശേഷം:**
Experts നിങ്ങളുടെ project-ൽ interest കാണിക്കാം। നിങ്ങൾക്ക് specific experts-നെ invite ചെയ്യാം। Interested experts-ന്റെ profiles review ചെയ്ത് chat വഴി conversations ആരംഭിക്കുക।`,
            userTypes: ['customer'],
            links: [
                { text: 'Create Work Request', url: '/customer/create-work-request' },
                { text: 'Browse Work Requests', url: '/work-requests' },
                { text: 'Find Experts', url: '/find-professionals?type=expert' }
            ],
            expanded: false
        },
        {
            id: 'customer-material-requests-ml',
            title: 'Material Request എങ്ങനെ പോസ്റ്റ് ചെയ്യാം',
            content: `Material requests നിർമ്മാണ സാമഗ്രികൾക്കും സപ്ലൈകൾക്കുമായി വിതരണക്കാരിൽ നിന്ന് ഉദ്ധരണികൾ ലഭിക്കാൻ നിങ്ങളെ സഹായിക്കുന്നു.

**ഘട്ടം ഘട്ടമായുള്ള പ്രക്രിയ:**

**1. Create Request എന്നതിലേക്ക് പോകുക**
"Create Request" എന്നതിലേക്ക് പോയി "Material Request" തിരഞ്ഞെടുക്കുക. material request creation form ആക്സസ് ചെയ്യുക.

**2. Material details പൂരിപ്പിക്കുക:**
- **Title**: സംക്ഷിപ്ത വിവരണം (ഉദാ. "അടിസ്ഥാനത്തിനായി സിമന്റും സ്റ്റീലും")
- **Description**: വിശദമായ material requirements, specifications
- **Delivery Location**: എവിടെയാണ് materials എത്തിക്കേണ്ടത്
- **Delivery Date**: എപ്പോഴാണ് നിങ്ങൾക്ക് materials വേണ്ടത് (ഓപ്ഷണൽ)
- **Link to Work Request**: നിലവിലുള്ള പ്രോജക്റ്റുമായി ബന്ധിപ്പിക്കുക (ഓപ്ഷണൽ)

**3. Material items ചേർക്കുക:**
നിങ്ങൾക്ക് ആവശ്യമുള്ള ഓരോ മെറ്റീരിയലിനും:
- **Item name**: (ഉദാ. "സിമന്റ് ബാഗുകൾ", "സ്റ്റീൽ റോഡുകൾ", "പെയിന്റ് ബക്കറ്റുകൾ")
- **Quantity**: (ഉദാ. "50 ബാഗുകൾ", "2 ടൺ", "500 അടി")
- **Notes/specifications**: (ഉദാ. "ഗ്രേഡ് 43", "10mm വ്യാസം", "കാലാവസ്ഥയെ പ്രതിരോധിക്കുന്നത്")

**4. Documents പതിവേറ്റവുമ്:**
Add specifications, drawings, അല്ലെങ്കിൽ reference files ചേർക്കുക. പിന്തുണയ്ക്കുന്ന ഫയൽ തരങ്ങൾ: PDF, Word, Excel, Images, CAD files (DWG, DXF). ഓരോ ഫയലിനും പരമാവധി 25MB, ഓരോ അഭ്യർത്ഥനയ്ക്കും 20 ഫയലുകൾ വരെ.

**5. നിങ്ങളുടെ request submit ചെയ്യുക**
എല്ലാ വിശദാംശങ്ങളും അറ്റാച്ചുമെന്റുകളും അവലോകനം ചെയ്യുക. വിതരണക്കാർക്ക് നിങ്ങളുടെ അഭ്യർത്ഥന ലഭിക്കുകയും അവർക്ക് ഉദ്ധരണികൾ നൽകാനും കഴിയും.`,
            userTypes: ['customer'],
            links: [
                { text: 'Create Material Request', url: '/customer/create-material-request' },
                { text: 'Browse Material Requests', url: '/material-requests' },
                { text: 'Find Suppliers', url: '/find-professionals?type=supplier' }
            ],
            expanded: false
        },
        {
            id: 'customer-contract-conditions-ml',
            title: 'എപ്പോഴാണ് നിങ്ങൾക്ക് Contracts ഉണ്ടാക്കാൻ കഴിയുക, വ്യവസ്ഥകൾ എന്തൊക്കെയാണ്?',
            content: `വിജയകരമായ പ്രോജക്ട് മാനേജ്മെന്റിനായി എപ്പോഴാണ്, എങ്ങനെയാണ് നിങ്ങൾക്ക് കരാറുകൾ ഉണ്ടാക്കാൻ കഴിയുക എന്ന് മനസ്സിലാക്കുന്നത് അത്യാവശ്യമാണ്.

**Customers എപ്പോഴാണ് contracts ഉണ്ടാക്കാൻ കഴിയുക?**
- വിദഗ്ദ്ധരോ വിതരണക്കാരോ നിങ്ങളുടെ അഭ്യർത്ഥനകളിൽ താൽപ്പര്യം പ്രകടിപ്പിച്ചതിന് ശേഷം
- നിങ്ങളുടെ പ്രോജക്റ്റിൽ താൽപ്പര്യം കാണിച്ച ആരെയെങ്കിലും നിയമിക്കാൻ നിങ്ങൾ ആഗ്രഹിക്കുമ്പോൾ
- നിങ്ങളുടെ അഭ്യർത്ഥനയുടെ താൽപ്പര്യമുള്ള അല്ലെങ്കിൽ ക്ഷണിക്കപ്പെട്ട ലിസ്റ്റുകളിലുള്ള പ്രൊഫഷണലുകളുമായി മാത്രം
- Work requests (expert contracts), material requests (material contracts) എന്നിവയ്ക്കായി

**Contract ഉണ്ടാക്കുന്നതിനുള്ള ആവശ്യമായ വ്യവസ്ഥകൾ:**
- **Authorization**: നിങ്ങൾ അഭ്യർത്ഥന പോസ്റ്റ് ചെയ്ത ഉപഭോക്താവായിരിക്കണം
- **Professional interest**: വിദഗ്ദ്ധൻ/വിതരണക്കാരൻ താൽപ്പര്യം പ്രകടിപ്പിക്കുകയോ ക്ഷണിക്കുകയോ ചെയ്തിരിക്കണം
- **Request status**: നിങ്ങളുടെ അഭ്യർത്ഥന ഉചിതമായ സ്റ്റാറ്റസിൽ ആയിരിക്കണം (സാധാരണയായി 'open' അല്ലെങ്കിൽ 'in_discussion')
- **Active participants**: നിങ്ങൾക്കും പ്രൊഫഷണലിനും സജീവ അക്കൗണ്ടുകൾ ഉണ്ടായിരിക്കണം

**Contract ഉണ്ടാക്കുന്നതിനുള്ള പ്രക്രിയ:**
1. **താൽപ്പര്യമുള്ള പ്രൊഫഷണലുകളിലേക്ക് പോകുക**: നിങ്ങളുടെ അഭ്യർത്ഥന വിശദാംശ പേജിലേക്ക് പോകുക
2. **താൽപ്പര്യമുള്ള കക്ഷികളെ അവലോകനം ചെയ്യുക**: താൽപ്പര്യം പ്രകടിപ്പിച്ച വിദഗ്ദ്ധരുടെ/വിതരണക്കാരുടെ ലിസ്റ്റ് പരിശോധിക്കുക
3. **ഒരു പ്രൊഫഷണലിനെ തിരഞ്ഞെടുക്കുക**: അവരുടെ പ്രൊഫൈലിന് അടുത്തുള്ള "Create Contract" ക്ലിക്കുചെയ്യുക
4. **Contract details പൂരിപ്പിക്കുക**: പ്രവർത്തനത്തിന്റെ വ്യാപ്തി, സമയപരിധി, പേയ്‌മെന്റ് നിബന്ധനകൾ എന്നിവയുൾപ്പെടെ ആവശ്യമായ എല്ലാ ഫീൽഡുകളും പൂരിപ്പിക്കുക
5. **ഒപ്പുകൾക്കായി സമർപ്പിക്കുക**: കരാർ സജീവമാക്കുന്നതിന് ഇരു കക്ഷികളും ഒപ്പിടണം`,
            userTypes: ['customer'],
            links: [
                { text: 'View My Requests', url: '/my-requests' },
                { text: 'Create New Request', url: '/customer/create-request' },
                { text: 'My Contracts', url: '/contracts' }
            ],
            expanded: false
        },
        {
            id: 'expert-getting-started-ml',
            title: 'Expert ആയി ആരംഭിക്കുന്നു',
            content: `GEFIFI-ലേക്ക് സ്വാഗതം! Expert എന്ന നിലയിൽ, നിങ്ങൾക്ക് നിർമ്മാണ പ്രോജക്റ്റുകൾ കണ്ടെത്താനും നിങ്ങളുടെ കഴിവുകൾ ആവശ്യമുള്ള ഉപഭോക്താക്കളുമായി ബന്ധപ്പെടാനും കഴിയും.

**ആദ്യ ഘട്ടങ്ങൾ:**

**1. നിങ്ങളുടെ profile പൂർത്തിയാക്കുക**
നിങ്ങളുടെ വൈദഗ്ദ്ധ്യം, അനുഭവം, സ്ഥലം എന്നിവ ചേർക്കുക. Plumbing, Electrical, Masonry, Carpentry, Interior Design, General Construction തുടങ്ങിയ വിഭാഗങ്ങളിൽ നിന്ന് തിരഞ്ഞെടുക്കുക.

**2. Work requests browse ചെയ്യുക**
നിങ്ങളുടെ കഴിവുകളുമായി പൊരുത്തപ്പെടുന്ന പ്രോജക്റ്റുകൾ കണ്ടെത്തുക. സ്ഥലം, വിഭാഗം, ബഡ്ജറ്റ് എന്നിവ അനുസരിച്ച് ഫിൽട്ടർ ചെയ്യുക.

**3. Interest പ്രകടിപ്പിക്കുക**
ഉപഭോക്താക്കൾക്ക് അവരുടെ പ്രോജക്റ്റുകൾക്കായി നിങ്ങൾ ലഭ്യമാണെന്ന് കാണിക്കുക. നിങ്ങളുടെ പ്രസക്തമായ അനുഭവം വിശദീകരിക്കുന്ന വ്യക്തിഗത സന്ദേശങ്ങൾ അയയ്ക്കുക.

**4. Customers-മായി chat ചെയ്യുക**
പ്രോജക്റ്റ് വിശദാംശങ്ങളും ആവശ്യകതകളും ചർച്ച ചെയ്യുക. ചോദ്യങ്ങൾക്ക് ഉത്തരം നൽകുകയും പ്രൊഫഷണൽ ഉപദേശം നൽകുകയും ചെയ്യുക.

**5. Contracts ഉണ്ടാക്കുക**
തിരഞ്ഞെടുത്ത പ്രോജക്റ്റുകൾക്കായി കരാറുകൾ ഔപചാരികമാക്കുക. വ്യക്തമായ നിബന്ധനകൾ, സമയപരിധികൾ, പേയ്‌മെന്റ് ഷെഡ്യൂളുകൾ എന്നിവ സജ്ജമാക്കുക.`,
            userTypes: ['expert'],
            links: [
                { text: 'Browse Work Requests', url: '/work-requests' },
                { text: 'Edit Profile', url: '/profile' }
            ],
            expanded: false
        },
        {
            id: 'supplier-getting-started-ml',
            title: 'Supplier ആയി ആരംഭിക്കുന്നു',
            content: `GEFIFI-ലേക്ക് സ്വാഗതം! Supplier എന്ന നിലയിൽ, നിങ്ങൾക്ക് ഉപഭോക്താക്കൾക്കും കരാറുകാർക്കും നിർമ്മാണ സാമഗ്രികളും സപ്ലൈകളും നൽകാൻ കഴിയും.

**ആദ്യ ഘട്ടങ്ങൾ:**

**1. നിങ്ങളുടെ profile പൂർത്തിയാക്കുക**
കമ്പനിയുടെ പേര്, മെറ്റീരിയൽ വിഭാഗങ്ങൾ, സ്ഥലം എന്നിവ ചേർക്കുക. Cement & Steel, Paints & Finishes, Electrical Supplies, Plumbing Materials, Tools & Equipment തുടങ്ങിയ വിഭാഗങ്ങളിൽ നിന്ന് തിരഞ്ഞെടുക്കുക.

**2. Material requests browse ചെയ്യുക**
നിങ്ങളുടെ ഉൽപ്പന്നങ്ങൾ ആവശ്യമുള്ള ഉപഭോക്താക്കളെ കണ്ടെത്തുക. മെറ്റീരിയൽ തരം, സ്ഥലം, ഡെലിവറി ആവശ്യകതകൾ എന്നിവ അനുസരിച്ച് ഫിൽട്ടർ ചെയ്യുക.

**3. Interest പ്രകടിപ്പിക്കുക**
ഉപഭോക്താക്കൾക്ക് അവരുടെ ആവശ്യകതകൾ നിറവേറ്റാൻ നിങ്ങൾക്ക് കഴിയുമെന്ന് കാണിക്കുക. മത്സരപരമായ വിലനിർണ്ണയത്തോടുകൂടിയ വിശദമായ ഉദ്ധരണികൾ നൽകുക.

**4. Quotes നൽകുക**
മത്സരപരമായ വിലനിർണ്ണയവും ഡെലിവറി നിബന്ധനകളും വാഗ്ദാനം ചെയ്യുക. ഗുണനിലവാര വിവരങ്ങളും സർട്ടിഫിക്കേഷനുകളും ഉൾപ്പെടുത്തുക.

**5. Contracts ഉണ്ടാക്കുക**
വിതരണ കരാറുകൾ ഔപചാരികമാക്കുക. വ്യക്തമായ ഡെലിവറി നിബന്ധനകൾ, പേയ്‌മെന്റ് ഷെഡ്യൂളുകൾ, ഗുണനിലവാര മാനദണ്ഡങ്ങൾ എന്നിവ സജ്ജമാക്കുക.`,
            userTypes: ['supplier'],
            links: [
                { text: 'Browse Material Requests', url: '/material-requests' },
                { text: 'Edit Profile', url: '/profile' }
            ],
            expanded: false
        },
        {
            id: 'chat-communication-ml',
            title: 'Chat System ഉപയോഗിക്കുന്നു',
            content: `GEFIFI-യുടെ chat system customers, experts, suppliers എന്നിവർ തമ്മിൽ real-time communication enable ചെയ്യുന്നു।

**Chat features:**
- **Text messages**: Instant messages അയയ്ക്കുകയും സ്വീകരിക്കുകയും ചെയ്യുക
- **Voice messages**: Audio messages record ചെയ്ത് അയയ്ക്കുക (5 minutes വരെ)
- **Image sharing**: Photos, documents, files share ചെയ്യുക
- **Typing indicators**: മറ്റുള്ളവർ എപ്പോൾ type ചെയ്യുന്നുവെന്ന് കാണുക
- **Online status**: Participants എപ്പോൾ available ആണെന്ന് അറിയുക
- **Message history**: Complete conversation history access ചെയ്യുക

**Chat എങ്ങനെ ആരംഭിക്കാം:**
1. **Express interest**: Customer-മായി automatically chat create ആകുന്നു
2. **Profiles-ൽ നിന്ന്**: Professional profiles-ൽ നിന്ന് interest അയയ്ക്കുക
3. **Contract discussions**: ഓരോ contract-നും chats create ആകുന്നു

**Voice messages:**
Record ചെയ്യാൻ microphone button press ചെയ്ത് hold ചെയ്യുക। Send ചെയ്യുന്നതിന് മുമ്പ് നിങ്ങളുടെ recording കേൾക്കുക। Send ചെയ്യാൻ release ചെയ്യുക, അല്ലെങ്കിൽ cancel ചെയ്യാൻ swipe ചെയ്യുക।`,
            userTypes: ['customer', 'expert', 'supplier'],
            links: [{ text: 'Open Chat', url: '/chat' }],
            expanded: false
        },
        {
            id: 'profile-management-ml',
            title: 'നിങ്ങളുടെ Profile മാനേജ് ചെയ്യുന്നു',
            content: `വിശ്വാസം വളർത്തുന്നതിനും ശരിയായ അവസരങ്ങൾ ആകർഷിക്കുന്നതിനും നിങ്ങളുടെ പ്രൊഫൈൽ നിർണ്ണായകമാണ്.

**Profile sections:**
- **Basic information**: പേര്, ഇമെയിൽ, സ്ഥലം, ഫോൺ നമ്പർ
- **Professional details**: അനുഭവം, വൈദഗ്ദ്ധ്യം/വിഭാഗം
- **Profile photo**: ഒരു പ്രൊഫഷണൽ അവതാർ ചിത്രം അപ്‌ലോഡ് ചെയ്യുക
- **Company information**: വിതരണക്കാർക്കായി, കമ്പനി വിശദാംശങ്ങൾ ചേർക്കുക

**Customers-നായി:**
- **Full name**: ആശയവിനിമയത്തിനുള്ള നിങ്ങളുടെ പേര്
- **Location**: നിങ്ങളുടെ പ്രോജക്റ്റ് ലൊക്കേഷൻ ഏരിയ
- **Contact**: അടിയന്തര ആശയവിനിമയത്തിനുള്ള ഫോൺ നമ്പർ

**Experts-നായി:**
- **Expertise**: നിങ്ങളുടെ സ്പെഷ്യലൈസേഷൻ (Plumbing, Electrical, മുതലായവ)
- **Experience**: നിർമ്മാണ വ്യവസായത്തിലെ വർഷങ്ങളുടെ അനുഭവം
- **Service area**: നിങ്ങൾ ജോലി ചെയ്യുന്ന സ്ഥലങ്ങൾ

**Suppliers-നായി:**
- **Company name**: നിങ്ങളുടെ ബിസിനസ്സ് പേര്
- **Category**: നിങ്ങൾ വിതരണം ചെയ്യുന്ന മെറ്റീരിയലുകളുടെ തരങ്ങൾ
- **Supply area**: നിങ്ങൾ സേവനം നൽകുന്ന ഡെലിവറി ലൊക്കേഷനുകൾ

**Profile photo മാർഗ്ഗനിർദ്ദേശങ്ങൾ:**
വ്യക്തവും ഉയർന്ന നിലവാരമുള്ളതുമായ ചിത്രത്തോടുകൂടിയ പ്രൊഫഷണൽ രൂപം. പിന്തുണയ്ക്കുന്ന ഫോർമാറ്റുകൾ: JPEG, PNG, GIF, WebP, SVG. പരമാവധി 2MB ഫയൽ വലുപ്പം. ചതുര ചിത്രങ്ങൾ മികച്ച രീതിയിൽ പ്രവർത്തിക്കുന്നു.

**എന്തുകൊണ്ടാണ് നിങ്ങളുടെ പ്രൊഫൈൽ പൂർത്തിയാക്കേണ്ടത്:**
പൂർണ്ണമായ പ്രൊഫൈലുകൾക്ക് കൂടുതൽ പ്രതികരണങ്ങൾ ലഭിക്കുന്നു, മികച്ച പൊരുത്തപ്പെടുത്തലിന് സഹായിക്കുന്നു, നിങ്ങളുടെ ബിസിനസ്സിനെക്കുറിച്ച് നിങ്ങൾ ഗൗരവമുള്ളവരാണെന്ന് കാണിക്കുന്നു.`,
            userTypes: ['customer', 'expert', 'supplier'],
            links: [{ text: 'Edit Profile', url: '/profile' }],
            expanded: false
        },
        {
            id: 'troubleshooting-ml',
            title: 'പൊതുവായ പ്രശ്നങ്ങൾ പരിഹരിക്കുന്നു',
            content: `പൊതുവായ പ്രശ്നങ്ങൾക്കും സാങ്കേതിക പ്രശ്നങ്ങൾക്കുമുള്ള പരിഹാരങ്ങൾ.

**Login, account പ്രശ്നങ്ങൾ:**
- **Forgot password**: ലോഗിൻ പേജിലെ പാസ്‌വേഡ് റീസെറ്റ് ഓപ്ഷൻ ഉപയോഗിക്കുക
- **Account locked**: നിങ്ങളുടെ അക്കൗണ്ട് ആക്‌സസ് ചെയ്യാൻ കഴിയുന്നില്ലെങ്കിൽ പിന്തുണയുമായി ബന്ധപ്പെടുക
- **Profile updates**: മാറ്റങ്ങൾ ഉടനടി ദൃശ്യമാകുന്നില്ലെങ്കിൽ പേജ് പുതുക്കുക
- **Session expired**: നിങ്ങൾക്ക് പ്രാമാണീകരണ പിശകുകൾ കാണുകയാണെങ്കിൽ ലോഗ് ഔട്ട് ചെയ്ത് വീണ്ടും ലോഗിൻ ചെയ്യുക

**File upload പ്രശ്നങ്ങൾ:**
- **Large files**: ഫയലുകൾ വലുപ്പ പരിധിക്കുള്ളിലാണെന്ന് ഉറപ്പാക്കുക (അവതാറുകൾക്ക് 2MB, പ്രമാണങ്ങൾക്ക് 25MB)
- **Unsupported formats**: ഫയൽ തരങ്ങൾ പിന്തുണയ്ക്കുന്നുണ്ടോയെന്ന് പരിശോധിക്കുക
- **Upload failures**: പേജ് പുതുക്കി വീണ്ടും അപ്‌ലോഡ് ചെയ്യാൻ ശ്രമിക്കുക
- **Image previews**: ചിത്രങ്ങൾ ശരിയായി പ്രദർശിപ്പിക്കുന്നില്ലെങ്കിൽ ബ്രൗസർ കാഷെ മായ്‌ക്കുക

**Chat, messaging:**
- **Messages അയക്കുന്നില്ല**: നിങ്ങളുടെ ഇന്റർനെറ്റ് കണക്ഷൻ പരിശോധിക്കുക
- **Voice messages പ്ലേ ചെയ്യുന്നില്ല**: ബ്രൗസറിന് മീഡിയ അനുമതികൾ ഉണ്ടെന്ന് ഉറപ്പാക്കുക
- **File sharing failures**: ഫയൽ വലുപ്പവും ഫോർമാറ്റ് ആവശ്യകതകളും പരിശോധിക്കുക
- **Connection issues**: പേജ് പുതുക്കുക അല്ലെങ്കിൽ നിങ്ങളുടെ ബ്രൗസർ പുനരാരംഭിക്കുക

**Performance പ്രശ്നങ്ങൾ:**
- **Slow loading**: ബ്രൗസർ കാഷെയും കുക്കികളും മായ്‌ക്കുക
- **Browser compatibility**: Chrome, Firefox, അല്ലെങ്കിൽ Safari-യുടെ അപ്‌ഡേറ്റ് ചെയ്ത പതിപ്പുകൾ ഉപയോഗിക്കുക
- **Mobile issues**: പൂർണ്ണമായ പ്രവർത്തനത്തിനായി ഡെസ്ക്ടോപ്പ് പതിപ്പ് പരീക്ഷിക്കുക
- **Offline access**: ചില സവിശേഷതകൾക്ക് ഇന്റർനെറ്റ് കണക്ഷൻ ആവശ്യമാണ്

**എപ്പോഴാണ് പിന്തുണയുമായി ബന്ധപ്പെടേണ്ടത്:**
പേയ്‌മെന്റ് പ്രശ്നങ്ങൾ, അക്കൗണ്ട് സ്ഥിരീകരണ പ്രശ്നങ്ങൾ, സ്ഥിരമായ സാങ്കേതിക ബഗുകൾ, അല്ലെങ്കിൽ ഈ സഹായ വിഭാഗം നിങ്ങളുടെ ചോദ്യത്തിന് ഉത്തരം നൽകുന്നില്ലെങ്കിൽ പിന്തുണയുമായി ബന്ധപ്പെടുക.`,
            userTypes: ['customer', 'expert', 'supplier'],
            links: [{ text: 'Contact Support', url: '#contact-support' }],
            expanded: false
        }
    ]
};

// Tamil help content
export const tamilHelpContent: HelpContent = {
    sections: [
        {
            id: 'customer-getting-started-ta',
            title: 'Customer ஆக தொடங்குதல்',
            content: `GEFIFI-க்கு வரவேற்கிறோம்! Customer ஆக, திறமையான experts-ஐ கண்டறிய work requests பதிவிட்டு, suppliers-ளிடமிருந்து quotes பெற material requests உருவாக்கலாம்.

**Step 1: உங்கள் profile-ஐ முழுமையாக்குங்கள்**
உங்கள் பெயர், இடம், தொடர்பு விவரங்களை சேர்க்கவும். சிறந்த நம்பிக்கைக்காக profile photo பதிவேற்றவும்.

**Step 2: உங்கள் முதல் request-ஐ பதிவிடுங்கள்**
Work Request (experts-ஐ வேலைக்கு அமர்த்த) அல்லது Material Request (materials வாங்க) இடையே தேர்ந்தெடுக்கவும். விரிவான requirements மற்றும் specifications நிரப்பவும்.

**Step 3: Interested professionals-ஐ மதிப்பாய்வு செய்யுங்கள்**
Experts மற்றும் suppliers உங்கள் requests-ல் ஆர்வம் காட்டுவார்கள். அவர்களின் profiles, experience, ratings-ஐ மதிப்பாய்வு செய்யுங்கள்.

**Step 4: Contracts உருவாக்குங்கள்**
தேர்ந்தெடுத்த professionals-உடன் agreements-ஐ formalize செய்யுங்கள். தெளிவான terms, timelines, payment schedules அமைக்கவும்.

**Step 5: உங்கள் projects-ஐ கண்காணிக்கவும்**
எங்கள் project management system மூலம் progress கண்காணிக்கவும். Chat மூலம் professionals-உடன் தொடர்பு கொள்ளுங்கள்.`,
            userTypes: ['customer'],
            links: [
                { text: 'Create New Request', url: '/customer/create-request' },
                { text: 'View My Requests', url: '/my-requests' },
                { text: 'Edit Profile', url: '/profile' }
            ],
            expanded: false
        },
        {
            id: 'customer-work-requests-ta',
            title: 'Work Request எப்படி பதிவிடுவது',
            content: `Work requests உங்கள் construction projects-க்காக plumbers, electricians, masons, contractors போன்ற திறமையான experts-ஐ கண்டறிய உதவுகின்றன.

**Step-by-step செயல்முறை:**

**1. Create Request-க்கு செல்லுங்கள்**
"Create Request"-க்கு சென்று "Work Request" தேர்ந்தெடுக்கவும். நீங்கள் work request creation form-ஐ பார்ப்பீர்கள்.

**2. Project details நிரப்புங்கள்:**
- **Title**: சுருக்கமான சுருக்கம் (உதா., "Bathroom Renovation", "Kitchen Remodeling")
- **Category**: 11+ categories-ளில் இருந்து தேர்ந்தெடுக்கவும் (Plumbing, Electrical, Masonry, போன்றவை)
- **Description**: விரிவான project requirements மற்றும் specifications
- **Location**: வேலை செய்யப்பட வேண்டிய இடம்
- **Expected Cost**: உங்கள் budget estimate (optional ஆனால் helpful)
- **Timeline**: வேலை எப்போது முடிக்க வேண்டும்
- **Materials Suggested**: ஏதேனும் specific material requirements

**3. Images பதிவேற்றுங்கள்**
Work area-வின் photos அல்லது reference images சேர்க்கவும். Supported formats: JPEG, PNG, GIF, WebP. Maximum 10 images per request, ஒவ்வொன்றும் 10MB வரை.

**4. உங்கள் request-ஐ submit செய்யுங்கள்**
Submit செய்வதற்கு முன் எல்லா details-ஐயும் மதிப்பாய்வு செய்யுங்கள். உங்கள் request உங்கள் area-வில் உள்ள experts-க்கு தெரியும்.

**பதிவிட்ட பிறகு:**
Experts உங்கள் project-ல் ஆர்வம் காட்டலாம். நீங்கள் specific experts-ஐ அழைக்கலாம். Interested experts-ன் profiles மதிப்பாய்வு செய்து chat மூலம் conversations தொடங்குங்கள்.`,
            userTypes: ['customer'],
            links: [
                { text: 'Create Work Request', url: '/customer/create-work-request' },
                { text: 'Browse Work Requests', url: '/work-requests' },
                { text: 'Find Experts', url: '/find-professionals?type=expert' }
            ],
            expanded: false
        },
        {
            id: 'customer-material-requests-ta',
            title: 'Material Request எப்படி பதிவிடுவது',
            content: `Material requests निर्माणப் பொருட்கள் மற்றும் விநியோகங்களுக்காக விநியோகஸ்தர்களிடமிருந்து மேற்கோள்களைப் பெற உதவுகின்றன.

**படிப்படியான செயல்முறை:**

**1. Create Request என்பதற்குச் செல்லவும்**
"Create Request" என்பதற்குச் சென்று "Material Request" என்பதைத் தேர்ந்தெடுக்கவும். material request creation form-ஐ அணுகவும்.

**2. Material details நிரப்பவும்:**
- **Title**: சுருக்கமான விளக்கம் (எ.கா. "அடித்தளத்திற்கான சிமெண்ட் மற்றும் ஸ்டீல்")
- **Description**: விரிவான பொருள் தேவைகள் மற்றும் விவரக்குறிப்புகள்
- **Delivery Location**: பொருட்கள் எங்கு வழங்கப்பட வேண்டும்
- **Delivery Date**: உங்களுக்கு எப்போது பொருட்கள் தேவை (விருப்பத்தேர்வு)
- **Link to Work Request**: நிலவிலுள்ள திட்டத்துடன் இணைக்கவும் (விருப்பத்தேர்வு)

**3. Material items சேர்க்கவும்:**
உங்களுக்குத் தேவையான ஒவ்வொரு பொருளுக்கும்:
- **Item name**: (எ.கா. "சிமெண்ட் பைகள்", "ஸ்டீல் ராடுகள்", "பெயிண்ட் பக்கெட்டுகள்")
- **Quantity**: (எ.கா. "50 பைகள்", "2 டன்", "500 அடி")
- **Notes/specifications**: (எ.கா. "கிரேடு 43", "10mm விட்டம்", "வானிலை எதிர்ப்பு")

**4. Documents பதிவேற்றவும்**
விவரக்குறிப்புகள், வரைபடங்கள் அல்லது குறிப்புக் கோப்புகளைச் சேர்க்கவும். ஆதரவளிக்கும் கோப்பு வகைகள்: PDF, Word, Excel, Images, CAD files (DWG, DXF). ஒரு கோப்புக்கு அதிகபட்சம் 25MB, ஒரு கோரிக்கைக்கு 20 கோப்புகள் வரை.

**5. உங்கள் request-ஐ submit செய்யுங்கள்**
എല്ലാ விவரங்കளையும் இணைப்புகளையும் மதிப்பாய்வு செய்யவும். விநியோகஸ்தர்கள் உங்கள் கோரிக்கையைப் பெறுவார்கள், மேலும் அவர்கள் மேற்கோள்களை வழங்க முடியும்.`,
            userTypes: ['customer'],
            links: [
                { text: 'Create Material Request', url: '/customer/create-material-request' },
                { text: 'Browse Material Requests', url: '/material-requests' },
                { text: 'Find Suppliers', url: '/find-professionals?type=supplier' }
            ],
            expanded: false
        },
        {
            id: 'customer-contract-conditions-ta',
            title: 'நீங்கள் எப்போது Contracts உருவாக்க முடியும், மற்றும் நிபந்தனைகள் என்ன?',
            content: `வெற்றிகரமான திட்ட நிர்வாகத்திற்கு நீங்கள் எப்போது, எப்படி ஒப்பந்தங்களை உருவாக்க முடியும் என்பதைப் புரிந்துகொள்வது அவசியம்.

**Customers எப்போது contracts உருவாக்க முடியும்?**
- வல்லுநர்கள் அல்லது வழங்குநர்கள் உங்கள் கோரிக்கைகளில் ஆர்வம் காட்டிய பிறகு
- உங்கள் திட்டத்தில் ஆர்வம் காட்டிய ஒருவரை நீங்கள் பணியமர்த்த விரும்பும்போது
- உங்கள் கோரிக்கையின் ஆர்வமுள்ள அல்லது அழைக்கப்பட்ட பட்டியல்களில் உள்ள நிபுணர்களுடன் மட்டுமே
- Work requests (expert contracts) மற்றும் material requests (material contracts) இரண்டிற்கும்

**Contract உருவாக்க தேவையான நிபந்தனைகள்:**
- **Authorization**: நீங்கள் கோரிக்கையை இடுகையிட்ட வாடிக்கையாளராக இருக்க வேண்டும்
- **Professional interest**: வல்லுநர்/வழங்குநர் ஆர்வம் காட்டியிருக்க வேண்டும் அல்லது அழைக்கப்பட்டிருக்க வேண்டும்
- **Request status**: உங்கள் கோரிக்கை பொருத்தமான நிலையில் இருக்க வேண்டும் (பொதுவாக 'open' அல்லது 'in_discussion')
- **Active participants**: நீங்களும் நிபுணரும் செயலில் உள்ள கணக்குகளைக் கொண்டிருக்க வேண்டும்

**Contract உருவாக்கும் செயல்முறை:**
1. **ஆர்வமுள்ள நிபுணர்களுக்குச் செல்லவும்**: உங்கள் கோரிக்கை விவரங்கள் பக்கத்திற்குச் செல்லவும்
2. **ஆர்வமுள்ள தரப்பினரை மதிப்பாய்வு செய்யவும்**: ஆர்வம் காட்டிய வல்லுநர்கள்/வழங்குநர்களின் பட்டியலைச் சரிபார்க்கவும்
3. **ஒரு நிபுணரைத் தேர்ந்தெடுக்கவும்**: அவர்களின் சுயவிவரத்திற்கு அடுத்துள்ள "Create Contract" என்பதைக் கிளிக் செய்யவும்
4. **Contract details நிரப்பவும்**: வேலை நோக்கம், காலக்கெடு மற்றும் கட்டண விதிமுறைகள் உட்பட தேவையான அனைத்து புலங்களையும் நிரப்பவும்
5. **கையொப்பங்களுக்காக சமர்ப்பிக்கவும்**: ஒப்பந்தத்தைச் செயல்படுத்த இரு தரப்பினரும் கையொப்பமிட வேண்டும்`,
            userTypes: ['customer'],
            links: [
                { text: 'View My Requests', url: '/my-requests' },
                { text: 'Create New Request', url: '/customer/create-request' },
                { text: 'My Contracts', url: '/contracts' }
            ],
            expanded: false
        },
        {
            id: 'expert-getting-started-ta',
            title: 'Expert ஆக தொடங்குதல்',
            content: `GEFIFI-க்கு வரவேற்கிறோம்! Expert ஆக, நீங்கள் கட்டுமானத் திட்டங்களைக் கண்டறியலாம் மற்றும் உங்கள் திறமைகள் தேவைப்படும் வாடிக்கையாளர்களுடன் இணையலாம்.

**முதல் படிகள்:**

**1. உங்கள் profile-ஐ முழுமையாக்குங்கள்**
உங்கள் நிபுணத்துவம், அனுபவம் மற்றும் இருப்பிடத்தைச் சேர்க்கவும். Plumbing, Electrical, Masonry, Carpentry, Interior Design, General Construction போன்ற வகைகளில் இருந்து തിരഞ്ഞെടുക്കുക.

**2. Work requests browse செய்யவும்**
உங்கள் திறமைகளுடன் பொருந்தக்கூடிய திட்டங்களைக் கண்டறியவும். இருப்பிடம், வகை மற்றும் பட்ஜெட் மூலம் வடிகட்டவும்.

**3. Interest வெளிப்படுத்தவும்**
வாடிக்கையாளர்களுக்கு அவர்களின் திட்டங்களுக்கு நீங்கள் கிடைப்பீர்கள் என்பதைக் காட்டவும். உங்கள் தொடர்புடைய அனுபவத்தை விளக்கும் தனிப்பயனாக்கப்பட்ட செய்திகளை அனுப்பவும்.

**4. Customers-உடன் chat செய்யவும்**
திட்ட விவரங்கள் மற்றும் தேவைகளைப் பற்றி விவாதிக்கவும். கேள்விகளுக்கு பதிலளித்து தொழில்முறை ஆலோசனைகளை வழங்கவும்.

**5. Contracts உருவாக்கவும்**
தேர்ந்தெடுக்கப்பட்ட திட்டங்களுக்கான ஒப்பந்தங்களை முறைப்படுத்தவும். தெளிவான விதிமுறைகள், காலக்கெடு மற்றும் கட்டண அட்டவணைகளை அமைக்கவும்.`,
            userTypes: ['expert'],
            links: [
                { text: 'Browse Work Requests', url: '/work-requests' },
                { text: 'Edit Profile', url: '/profile' }
            ],
            expanded: false
        },
        {
            id: 'supplier-getting-started-ta',
            title: 'Supplier ஆக தொடங்குதல்',
            content: `GEFIFI-க்கு வரவேற்கிறோம்! Supplier ஆக, நீங்கள் வாடிக்கையாளர்களுக்கும் ஒப்பந்தக்காரர்களுக்கும் கட்டுமானப் பொருட்கள் மற்றும் விநியோகங்களை வழங்கலாம்.

**முதல் படிகள்:**

**1. உங்கள் profile-ஐ முழுமையாக்குங்கள்**
 நிறுவனத்தின் பெயர், பொருள் வகைகள் மற்றும் இருப்பிடத்தைச் சேர்க்கவும். Cement & Steel, Paints & Finishes, Electrical Supplies, Plumbing Materials, Tools & Equipment போன்ற வகைகளில் இருந்து തിരഞ്ഞെടുക്കുക.

**2. Material requests browse செய்யவும்**
உங்கள் தயாரிப்புகள் தேவைப்படும் வாடிக்கையாளர்களைக் கண்டறியவும். பொருள் வகை, இருப்பிடம் மற்றும் விநியோகத் தேவைகள் மூலம் வடிகட்டவும்.

**3. Interest வெளிப்படுத்தவும்**
வாடிக்கையாளர்களுக்கு அவர்களின் தேவைகளை நீங்கள் பூர்த்தி செய்ய முடியும் என்பதைக் காட்டவும். போட்டி விலைகளுடன் விரிவான மேற்கோள்களை வழங்கவும்.

**4. Quotes வழங்கவும்**
போட்டி விலைகள் மற்றும் விநியோக விதிமுறைகளை வழங்கவும். தரமான தகவல்கள் மற்றும் சான்றிதழ்களைச் சேர்க்கவும்.

**5. Contracts உருவாக்கவும்**
விநியோக ஒப்பந்தங்களை முறைப்படுத்தவும். தெளிவான விநியோக விதிமுறைகள், கட்டண அட்டவணைகள் மற்றும் தரத் தரங்களை அமைக்கவும்.`,
            userTypes: ['supplier'],
            links: [
                { text: 'Browse Material Requests', url: '/material-requests' },
                { text: 'Edit Profile', url: '/profile' }
            ],
            expanded: false
        },
        {
            id: 'chat-communication-ta',
            title: 'Chat System பயன்படுத்துதல்',
            content: `GEFIFI-ன் chat system customers, experts, suppliers இடையே real-time communication enable செய்கிறது.

**Chat features:**
- **Text messages**: Instant messages அனுப்பி பெறுங்கள்
- **Voice messages**: Audio messages record செய்து அனுப்புங்கள் (5 minutes வரை)
- **Image sharing**: Photos, documents, files பகிருங்கள்
- **Typing indicators**: மற்றவர்கள் எப்போது type செய்கிறார்கள் என்று பாருங்கள்
- **Online status**: Participants எப்போது available என்று தெரிந்து கொள்ளுங்கள்
- **Message history**: Complete conversation history access செய்யுங்கள்

**Chat எப்படி தொடங்குவது:**
1. **Express interest**: Customer-உடன் automatically chat உருவாகும்
2. **Profiles-ளில் இருந்து**: Professional profiles-ளில் இருந்து interest அனுப்புங்கள்
3. **Contract discussions**: ஒவ்வொரு contract-க்கும் chats உருவாகும்

**Voice messages:**
Record செய்ய microphone button-ஐ press செய்து hold செய்யுங்கள். அனுப்புவதற்கு முன் உங்கள் recording-ஐ கேளுங்கள். அனுப்ப release செய்யுங்கள், அல்லது cancel செய்ய swipe செய்யுங்கள்.`,
            userTypes: ['customer', 'expert', 'supplier'],
            links: [{ text: 'Open Chat', url: '/chat' }],
            expanded: false
        },
        {
            id: 'profile-management-ta',
            title: 'உங்கள் Profile-ஐ நிர்வகித்தல்',
            content: `நம்பிக்கையை வளர்ப்பதற்கும் சரியான வாய்ப்புகளை ஈர்ப்பதற்கும் உங்கள் சுயவிவரம் முக்கியமானது.

**Profile sections:**
- **Basic information**: பெயர், மின்னஞ்சல், இருப்பிடம், தொலைபேசி எண்
- **Professional details**: அனுபவம், நிபுணத்துவம்/வகை
- **Profile photo**: ஒரு தொழில்முறை அவதார் படத்தைப் பதிவேற்றவும்
- **Company information**: வழங்குநர்களுக்கு, நிறுவனத்தின் விவரங்களைச் சேர்க்கவும்

**Customers-க்கு:**
- **Full name**: தகவல்தொடர்புகளுக்கான உங்கள் பெயர்
- **Location**: உங்கள் திட்ட இருப்பிடப் பகுதி
- **Contact**: அவசர தகவல்தொடர்புகளுக்கான தொலைபேசி எண்

**Experts-க்கு:**
- **Expertise**: உங்கள் நிபுணத்துவம் (Plumbing, Electrical, போன்றவை)
- **Experience**: கட்டுமானத் துறையில் பல வருட அனுபவம்
- **Service area**: நீங்கள் பணிபுரியும் இடங்கள்

**Suppliers-க்கு:**
- **Company name**: உங்கள் வணிகப் பெயர்
- **Category**: நீங்கள் வழங்கும் பொருட்களின் வகைகள்
- **Supply area**: நீங்கள் சேவை செய்யும் விநியோக இடங்கள்

**Profile photo வழிகாட்டுதல்கள்:**
தெளிவான, உயர்தரப் படத்துடன் தொழில்முறைத் தோற்றம். ஆதரவளிக்கும் வடிவங்கள்: JPEG, PNG, GIF, WebP, SVG. அதிகபட்சம் 2MB கோப்பு அளவு. சதுரப் படங்கள் சிறப்பாகச் செயல்படும்.

**உங்கள் சுயவிவரத்தை ஏன் முடிக்க வேண்டும்:**
முழுமையான சுயவிவரங்கள் அதிக பதில்களைப் பெறுகின்றன, சிறந்த பொருத்தத்திற்கு உதவுகின்றன, மேலும் உங்கள் வணிகத்தைப் பற்றி நீங்கள் தீவிரமாக இருக்கிறீர்கள் என்பதைக் காட்டுகின்றன.`,
            userTypes: ['customer', 'expert', 'supplier'],
            links: [{ text: 'Edit Profile', url: '/profile' }],
            expanded: false
        },
        {
            id: 'troubleshooting-ta',
            title: 'பொதுவான சிக்கல்களைச் சரிசெய்தல்',
            content: `பொதுவான சிக்கல்கள் மற்றும் தொழில்நுட்பச் சிக்கல்களுக்கான தீர்வுகள்.

**Login மற்றும் account சிக்கல்கள்:**
- **Forgot password**: உள்நுழைவுப் பக்கத்தில் கடவுச்சொல் மீட்டமைப்பு விருப்பத்தைப் பயன்படுத்தவும்
- **Account locked**: உங்கள் கணக்கை அணுக முடியாவிட்டால் ஆதரவைத் தொடர்பு கொள்ளவும்
- **Profile updates**: மாற்றங்கள் உடனடியாகத் தெரியவில்லை என்றால் பக்கத்தைப் புதுப்பிக்கவும்
- **Session expired**: அங்கீகாரப் பிழைகளைக் கண்டால் வெளியேறி மீண்டும் உள்நுழையவும்

**File upload சிக்கல்கள்:**
- **Large files**: கோப்புகள் அளவு வரம்புகளுக்குள் இருப்பதை உறுதிசெய்யவும் (அவதார்களுக்கு 2MB, ஆவணங்களுக்கு 25MB)
- **Unsupported formats**: கோப்பு வகைகள் ஆதரிக்கப்படுகின்றனவா என்பதைச் சரிபார்க்கவும்
- **Upload failures**: பக்கத்தைப் புதுப்பித்து மீண்டும் பதிவேற்ற முயற்சிக்கவும்
- **Image previews**: படங்கள் சரியாகக் காட்டப்படாவிட்டால் உலாவி கேச் அழிக்கவும்

**Chat மற்றும் messaging:**
- **Messages அனுப்பப்படவில்லை**: உங்கள் இணைய இணைப்பைச் சரிபார்க்கவும்
- **Voice messages ప్లే ஆகவில்லை**: உலாவிக்கு ஊடக அனுமதிகள் இருப்பதை உறுதிசெய்யவும்
- **File sharing failures**: கோப்பு அளவு மற்றும் வடிவமைப்புத் தேவைகளைச் சரிபார்க்கவும்
- **Connection issues**: பக்கத்தைப் புதுப்பிக்கவும் அல்லது உங்கள் உலாவியை மறுதொடக்கம் செய்யவும்

**Performance சிக்கல்கள்:**
- **Slow loading**: உலாவி கேச் மற்றும் குக்கீகளை அழிக்கவும்
- **Browser compatibility**: Chrome, Firefox, அல்லது Safari-யின் புதுப்பிக்கப்பட்ட பதிப்புகளைப் பயன்படுத்தவும்
- **Mobile issues**: முழுமையான செயல்பாட்டிற்கு டெஸ்க்டாப் பதிப்பை முயற்சிக்கவும்
- **Offline access**: சில அம்சங்களுக்கு இணைய இணைப்பு தேவை

**ஆதரவைத் எப்போது தொடர்பு கொள்ள வேண்டும்:**
கட்டணச் சிக்கல்கள், கணக்குச் சரிபார்ப்புச் சிக்கல்கள், தொடர்ச்சியான தொழில்நுட்பப் பிழைகள், அல்லது இந்த உதவிப் பிரிவு உங்கள் கேள்விக்கு பதிலளிக்கவில்லை என்றால் ஆதரவைத் தொடர்பு கொள்ளவும்.`,
            userTypes: ['customer', 'expert', 'supplier'],
            links: [{ text: 'Contact Support', url: '#contact-support' }],
            expanded: false
        }
    ]
};

export const helpContentMap = {
    en: englishHelpContent,
    hi: hindiHelpContent,
    ml: malayalamHelpContent,
    ta: tamilHelpContent
};