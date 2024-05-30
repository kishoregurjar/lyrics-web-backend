module.exports.forgetPassTempFun = (token, link) => {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lyrics Web - Forget Your Account</title>
        <link rel="stylesheet" href="styles.css">
        <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f0f0f0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        
        .container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            padding: 20px;
            max-width: 400px;
            text-align: center;
        }
        
        .verification-box h1 {
            color: #333;
            margin-bottom: 20px;
        }
        
        .verification-box p {
            color: #666;
            margin-bottom: 20px;
        }
        
        .verification-box #username {
            color: #333;
            font-weight: bold;
        }
        
        .verify-button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #28a745;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            transition: background-color 0.3s;
        }
        
        .verify-button:hover {
            background-color: #218838;
        }
        
        </style>
    </head>
    <body>
        <div class="container">
            <div class="verification-box">
                <h1>Reset Password Token</h1>
                <p>Token : <span id="username">${token}</span></p>
                <p>Thank you for signing up for Lyrics Web. Please click the button below to verify your email address.</p>
                <a href="${link}" id="verification-link" class="verify-button">Verify Email</a>
            </div>
        </div>
    </body>
    </html>
    `;
};
