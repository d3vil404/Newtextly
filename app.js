const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const uuid = require("uuid");

const app = express();
// Use the PORT provided by the platform or fallback to 3000
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));

// In-memory storage for snippets
const snippets = {};

// Auto-expire snippets
function expireSnippet(uniqueId, ttl) {
    setTimeout(() => {
        delete snippets[uniqueId];
    }, ttl);
}

// Middleware to assign a unique cookie ID to users
app.use((req, res, next) => {
    if (!req.cookies.userId) {
        res.cookie("userId", uuid.v4(), { maxAge: 30 * 60 * 1000 }); // 30 minutes cookie
    }
    next();
});

// Redirect to a random URL if the user visits the root
app.get("/", (req, res) => {
    const randomId = uuid.v4().substring(0, 6);
    res.redirect(`/${randomId}`);
});

// Add this helper function at the top with other utility functions
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Add this helper function at the top with other utility functions
function countWords(text) {
    // Split by whitespace and filter out empty strings
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Add this new helper function for URL validation
function isValidCustomUrl(url) {
    // Only allow alphanumeric characters and hyphens, length between 1-32 characters
    return /^[a-zA-Z0-9-]{1,32}$/.test(url);
}

// Handle GET requests to custom or random URLs
app.get("/:id", (req, res) => {
    const uniqueId = req.params.id;
    
    // Validate URL format
    if (!isValidCustomUrl(uniqueId)) {
        return res.status(400).send("Invalid URL format. Only alphanumeric characters and hyphens are allowed.");
    }

    if (snippets[uniqueId]) {
        const snippet = snippets[uniqueId];
        const isOwner = snippet.owner === req.cookies.userId;
        const isEditable = snippet.allowEdit || isOwner;
        
        // Escape the text when displaying
        const escapedText = escapeHtml(snippet.text);

        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/css/bootstrap.min.css" rel="stylesheet">
                <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/themes/prism-tomorrow.min.css" rel="stylesheet">
                <style>
                    :root {
                        --neon-primary: #0ff;
                        --neon-secondary: #f0f;
                        --dark-bg: #0a0a0a;
                        --card-bg: #151515;
                    }
                    
                    body { 
                        background-color: var(--dark-bg);
                        color: #fff;
                        font-family: 'Segoe UI', system-ui, -apple-system;
                    }

                    .snippet-container {
                        background: var(--card-bg);
                        border-radius: 12px;
                        box-shadow: 0 0 20px rgba(0, 255, 255, 0.1),
                                  0 0 40px rgba(0, 255, 255, 0.1);
                        padding: 2rem;
                        margin-top: 2rem;
                        border: 1px solid rgba(0, 255, 255, 0.1);
                        backdrop-filter: blur(10px);
                    }

                    .display-5 {
                        color: #fff;
                        text-shadow: 0 0 10px var(--neon-primary);
                        letter-spacing: 1px;
                    }

                    .snippet-text {
                        background: #1a1a1a;
                        color: #fff;
                        border-radius: 8px;
                        padding: 1.5rem;
                        margin: 1rem 0;
                        font-family: 'JetBrains Mono', 'Monaco', monospace;
                        border: 1px solid rgba(0, 255, 255, 0.2);
                        box-shadow: 0 0 15px rgba(0, 255, 255, 0.1);
                    }

                    .expiry-badge {
                        background: rgba(255, 255, 255, 0.1);
                        padding: 0.5rem 1rem;
                        border-radius: 20px;
                        display: inline-block;
                        margin: 1rem 0;
                        border: 1px solid rgba(0, 255, 255, 0.2);
                        color: var(--neon-primary);
                    }

                    .editor-area {
                        background: #1a1a1a !important;
                        border: 1px solid rgba(0, 255, 255, 0.2) !important;
                        border-radius: 8px;
                        color: #fff !important;
                        transition: all 0.3s ease;
                    }

                    .editor-area:focus {
                        border-color: var(--neon-primary) !important;
                        box-shadow: 0 0 15px rgba(0, 255, 255, 0.3) !important;
                    }

                    .btn-primary {
                        background: transparent;
                        border: 1px solid var(--neon-primary);
                        color: var(--neon-primary);
                        transition: all 0.3s ease;
                    }

                    .btn-primary:hover {
                        background: var(--neon-primary);
                        color: var(--dark-bg);
                        box-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
                        border-color: var(--neon-primary);
                    }

                    .btn-outline-secondary {
                        border-color: var(--neon-secondary);
                        color: var(--neon-secondary);
                    }

                    .btn-outline-secondary:hover {
                        background: var(--neon-secondary);
                        border-color: var(--neon-secondary);
                        box-shadow: 0 0 20px rgba(255, 0, 255, 0.4);
                    }

                    .alert-info {
                        background: rgba(0, 255, 255, 0.1);
                        border: none;
                        color: var(--neon-primary);
                    }

                    /* Success page styles */
                    .success-container {
                        background: var(--card-bg);
                        border-radius: 12px;
                        box-shadow: 0 0 20px rgba(0, 255, 255, 0.1);
                        padding: 2rem;
                        margin-top: 2rem;
                        border: 1px solid rgba(0, 255, 255, 0.1);
                    }

                    .link-box {
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 8px;
                        padding: 1rem;
                        margin: 1rem 0;
                        border: 1px solid rgba(0, 255, 255, 0.2);
                    }

                    .form-control {
                        background: #1a1a1a !important;
                        border: 1px solid rgba(0, 255, 255, 0.2) !important;
                        color: #fff !important;
                    }

                    .form-control:focus {
                        box-shadow: 0 0 15px rgba(0, 255, 255, 0.3) !important;
                        border-color: var(--neon-primary) !important;
                    }

                    /* Animation effects */
                    @keyframes glow {
                        0% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.1); }
                        50% { box-shadow: 0 0 30px rgba(0, 255, 255, 0.2); }
                        100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.1); }
                    }

                    .snippet-container {
                        animation: glow 3s infinite;
                    }

                    /* Scrollbar styling */
                    ::-webkit-scrollbar {
                        width: 8px;
                        height: 8px;
                    }

                    ::-webkit-scrollbar-track {
                        background: var(--dark-bg);
                    }

                    ::-webkit-scrollbar-thumb {
                        background: var(--neon-primary);
                        border-radius: 4px;
                    }

                    ::-webkit-scrollbar-thumb:hover {
                        background: rgba(0, 255, 255, 0.8);
                    }

                    .text-success {
                        color: var(--neon-primary) !important;
                    }
                    
                    .display-6 {
                        color: #fff;
                        text-shadow: 0 0 10px var(--neon-primary);
                    }

                    .text-muted {
                        color: rgba(255, 255, 255, 0.6) !important;
                    }

                    /* Add these new styles for the footer */
                    .credits {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        background: rgba(0, 0, 0, 0.8);
                        backdrop-filter: blur(10px);
                        padding: 1rem 0;
                        border-top: 1px solid rgba(0, 255, 255, 0.1);
                    }

                    .credits a {
                        color: var(--neon-primary);
                        text-decoration: none;
                        transition: all 0.3s ease;
                    }

                    .credits a:hover {
                        color: var(--neon-secondary);
                        text-shadow: 0 0 10px var(--neon-secondary);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="snippet-container">
                        <h1 class="display-5 mb-4">Shared Text</h1>
                        <div class="snippet-text">${escapedText}</div>
                        <div class="expiry-badge">
                            <i class="bi bi-clock"></i> Expires in ${snippet.expiry} minute(s)
                        </div>
                        ${
                            isEditable
                                ? `
                                <form method="POST" class="mt-4">
                                    <textarea name="text" class="form-control editor-area mb-3" rows="10">${escapedText}</textarea>
                                    <button type="submit" class="btn btn-primary px-4">
                                        <i class="bi bi-save"></i> Update Text
                                    </button>
                                </form>`
                                : `<div class="alert alert-info mt-3">
                                    <i class="bi bi-info-circle"></i> Editing is not allowed for this snippet.
                                   </div>`
                        }
                        <a href="/" class="btn btn-outline-secondary mt-3">
                            <i class="bi bi-plus-circle"></i> Share New Text
                        </a>
                    </div>
                </div>

                <footer class="credits text-center">
                    <div class="container">
                        <p class="mb-0">
                            Made with <i class="bi bi-heart-fill text-danger"></i> by 
                            <a href="https://codelinex.org" target="_blank">CodelineX.org</a> | 
                            <a href="https://www.linkedin.com/in/rishi-shakya-3a2b09324" target="_blank">
                                <i class="bi bi-linkedin"></i> Rishi Shakya
                            </a>
                        </p>
                    </div>
                </footer>

                <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/js/bootstrap.bundle.min.js"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/prism.min.js"></script>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css">
            </body>
            </html>
        `);
    }

    res.sendFile(__dirname + "/index.html");
});

// Handle POST requests to save snippets
app.post("/:id", (req, res) => {
    const { text, expiry, customUrl, allowEdit } = req.body;
    const WORD_LIMIT = 10000;

    // Validate URL format
    if (!isValidCustomUrl(req.params.id)) {
        return res.status(400).send("Invalid URL format. Only alphanumeric characters and hyphens are allowed.");
    }

    // If custom URL is provided, validate it
    if (customUrl && !isValidCustomUrl(customUrl)) {
        return res.status(400).send("Invalid custom URL format. Only alphanumeric characters and hyphens are allowed.");
    }

    if (!text) {
        return res.status(400).send("Error: Text content is required.");
    }

    // Add word limit check
    const wordCount = countWords(text);
    if (wordCount > WORD_LIMIT) {
        return res.status(400).send(`Error: Text exceeds maximum limit of ${WORD_LIMIT} words. Current length: ${wordCount} words.`);
    }

    let uniqueId = customUrl || req.params.id;

    if (customUrl && snippets[customUrl]) {
        return res.status(400).send("Error: Custom URL is already taken.");
    }

    const expiryTime = Math.min(Math.max(parseInt(expiry, 10) || 10, 1), 30);

    snippets[uniqueId] = {
        text,
        expiry: expiryTime,
        allowEdit: allowEdit === "on" ? true : false,
        owner: req.cookies.userId,
    };

    expireSnippet(uniqueId, expiryTime * 60 * 1000);

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/css/bootstrap.min.css" rel="stylesheet">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css">
            <style>
                :root {
                    --neon-primary: #0ff;
                    --neon-secondary: #f0f;
                    --dark-bg: #0a0a0a;
                    --card-bg: #151515;
                }

                body { 
                    background-color: var(--dark-bg);
                    color: #fff;
                    font-family: 'Segoe UI', system-ui, -apple-system;
                    min-height: 100vh;
                    position: relative;
                }

                .success-container {
                    background: var(--card-bg);
                    border-radius: 12px;
                    box-shadow: 0 0 20px rgba(0, 255, 255, 0.1);
                    padding: 2.5rem;
                    margin-top: 2rem;
                    border: 1px solid rgba(0, 255, 255, 0.1);
                    position: relative;
                    overflow: hidden;
                }

                .success-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, var(--neon-primary), transparent);
                    animation: scan 2s linear infinite;
                }

                @keyframes scan {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }

                .link-box {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    padding: 1.5rem;
                    margin: 1.5rem 0;
                    border: 1px solid rgba(0, 255, 255, 0.2);
                    backdrop-filter: blur(5px);
                }

                .copy-input {
                    background: #1a1a1a !important;
                    border: 1px solid rgba(0, 255, 255, 0.2) !important;
                    color: #fff !important;
                    padding: 0.8rem;
                }

                .copy-input:focus {
                    box-shadow: 0 0 15px rgba(0, 255, 255, 0.3) !important;
                    border-color: var(--neon-primary) !important;
                }

                .btn-copy {
                    background: transparent;
                    border: 1px solid var(--neon-primary);
                    color: var(--neon-primary);
                    transition: all 0.3s ease;
                    padding: 0.8rem 1.5rem;
                }

                .btn-copy:hover {
                    background: var(--neon-primary);
                    color: var(--dark-bg);
                    box-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
                }

                .credits {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(10px);
                    padding: 1rem 0;
                    border-top: 1px solid rgba(0, 255, 255, 0.1);
                }

                .credits a {
                    color: var(--neon-primary);
                    text-decoration: none;
                    transition: all 0.3s ease;
                }

                .credits a:hover {
                    color: var(--neon-secondary);
                    text-shadow: 0 0 10px var(--neon-secondary);
                }

                .success-icon {
                    font-size: 3rem;
                    color: var(--neon-primary);
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }

                .stats-box {
                    background: rgba(0, 255, 255, 0.05);
                    border-radius: 8px;
                    padding: 1rem;
                    margin-top: 1rem;
                    border: 1px solid rgba(0, 255, 255, 0.1);
                }

                .social-links {
                    margin-top: 2rem;
                }

                .social-links a {
                    margin: 0 10px;
                    font-size: 1.2rem;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-container">
                    <div class="text-center mb-4">
                        <i class="bi bi-check-circle-fill success-icon"></i>
                        <h3 class="display-6 mt-3">Text Shared Successfully!</h3>
                    </div>
                    
                    <div class="link-box">
                        <p class="mb-2">Your shareable link:</p>
                        <div class="d-flex align-items-center gap-2">
                            <input type="text" class="form-control copy-input" value="https://789c-2409-40d2-e-b98b-882e-2645-f2a3-8acc.ngrok-free.app/${uniqueId}" readonly>
                            <button class="btn btn-copy" onclick="copyToClipboard()">
                                <i class="bi bi-clipboard"></i> Copy
                            </button>
                        </div>
                    </div>

                    <div class="stats-box">
                        <div class="row text-center">
                            <div class="col">
                                <i class="bi bi-clock text-primary"></i>
                                <p class="mb-0">Expires in</p>
                                <h5>${expiryTime} minute(s)</h5>
                            </div>
                            <div class="col">
                                <i class="bi bi-shield-check text-primary"></i>
                                <p class="mb-0">Access</p>
                                <h5>${allowEdit ? 'Public' : 'Private'}</h5>
                            </div>
                        </div>
                    </div>

                    <div class="text-center mt-4">
                        <a href="/" class="btn btn-outline-secondary">
                            <i class="bi bi-plus-circle"></i> Share Another Text
                        </a>
                    </div>
                </div>
            </div>

            <footer class="credits text-center">
                <div class="container">
                    <p class="mb-0">
                        Made with <i class="bi bi-heart-fill text-danger"></i> by 
                        <a href="https://codelinex.org" target="_blank">CodelineX.org</a> | 
                        <a href="https://www.linkedin.com/in/rishi-shakya-3a2b09324" target="_blank">
                            <i class="bi bi-linkedin"></i> Rishi Shakya
                        </a>
                    </p>
                </div>
            </footer>

            <script>
                function copyToClipboard() {
                    const input = document.querySelector('.copy-input');
                    input.select();
                    navigator.clipboard.writeText(input.value);
                    
                    const btn = document.querySelector('.btn-copy');
                    btn.innerHTML = '<i class="bi bi-check2"></i> Copied!';
                    setTimeout(() => {
                        btn.innerHTML = '<i class="bi bi-clipboard"></i> Copy';
                    }, 2000);
                }
            </script>
        </body>
        </html>
    `);
});

// Handle POST requests to update existing snippets
app.post("/:id", (req, res) => {
    const uniqueId = req.params.id;
    const WORD_LIMIT = 10000;

    // Add word limit check for updates
    if (req.body.text) {
        const wordCount = countWords(req.body.text);
        if (wordCount > WORD_LIMIT) {
            return res.status(400).send(`Error: Text exceeds maximum limit of ${WORD_LIMIT} words. Current length: ${wordCount} words.`);
        }
    }

    if (snippets[uniqueId]) {
        const snippet = snippets[uniqueId];
        const isOwner = snippet.owner === req.cookies.userId;

        if (snippet.allowEdit || isOwner) {
            snippets[uniqueId].text = req.body.text;
            return res.redirect(`/${uniqueId}`);
        }
    }

    res.status(403).send("Editing not allowed for this snippet.");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
