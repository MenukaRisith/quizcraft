#!/bin/bash

# 1. Update System and Install Dependencies
echo "Updating system..."
sudo apt update && sudo apt upgrade -y

# Check for any issues in apt update
if [ $? -ne 0 ]; then
  echo "Error while updating system. Exiting..."
  exit 1
fi

echo "Installing dependencies..."

# Install Node.js (latest version) and NPM
curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Check if Node.js installed correctly
if [ $? -ne 0 ]; then
  echo "Error while installing Node.js. Exiting..."
  exit 1
fi

# Install PM2 globally
sudo npm install -g pm2

# Check if PM2 installed correctly
if [ $? -ne 0 ]; then
  echo "Error while installing PM2. Exiting..."
  exit 1
fi

# Install Apache2
sudo apt install -y apache2

# Check if Apache2 installed correctly
if [ $? -ne 0 ]; then
  echo "Error while installing Apache2. Exiting..."
  exit 1
fi

# Ask user if they want to install MySQL
echo "Do you want to install MySQL server? (y/n): "
read INSTALL_MYSQL

if [[ "$INSTALL_MYSQL" == "y" || "$INSTALL_MYSQL" == "Y" ]]; then
  # 2. Install MySQL
  echo "Installing MySQL..."
  sudo apt install -y mysql-server

  # Check if MySQL installed correctly
  if [ $? -ne 0 ]; then
    echo "Error while installing MySQL. Exiting..."
    exit 1
  fi

  # Secure MySQL Installation
  echo "Securing MySQL installation..."
  sudo mysql_secure_installation

  # Create the 'quizcraft' database
  echo "Creating MySQL database for QuizCraft..."
  sudo mysql -e "CREATE DATABASE quizcraft;"
  sudo mysql -e "CREATE USER 'quizcraft_user'@'localhost' IDENTIFIED BY 'password';"
  sudo mysql -e "GRANT ALL PRIVILEGES ON quizcraft.* TO 'quizcraft_user'@'localhost';"
  sudo mysql -e "FLUSH PRIVILEGES;"

  echo "MySQL installation and setup completed."
else
  echo "Skipping MySQL installation."
fi

# 3. Install dependencies in root folder
echo "Navigating to root folder and installing dependencies..."
cd ../
npm install

# Check if npm install worked
if [ $? -ne 0 ]; then
  echo "Error while installing dependencies in root folder. Exiting..."
  exit 1
fi

# 4. Install frontend and backend dependencies
echo "Navigating to frontend and installing dependencies..."
cd quizcraft-frontend
npm install
npm run build  # Build the frontend for production

# Check if frontend dependencies installed correctly
if [ $? -ne 0 ]; then
  echo "Error while installing frontend dependencies or building the frontend. Exiting..."
  exit 1
fi

# Navigate to backend and install dependencies
echo "Navigating to backend and installing dependencies..."
cd ../backend
npm install

# Check if backend dependencies installed correctly
if [ $? -ne 0 ]; then
  echo "Error while installing backend dependencies. Exiting..."
  exit 1
fi

# 5. Ask user for domain and IP
echo "Enter the domain name (e.g., example.com):"
read DOMAIN_NAME

# Get the public IP of the server
IP_ADDRESS=$(hostname -I | awk '{print $1}')
echo "Server IP is: $IP_ADDRESS"

# 6. Update the API URLs in the frontend config file
echo "Updating API_BASE_URL and SOCKET_BASE_URL in frontend config..."

FRONTEND_CONFIG_PATH="../quizcraft-frontend/app/config/api.ts"
sed -i "s|export const API_BASE_URL =.*|export const API_BASE_URL = \"http://$IP_ADDRESS:5000/api\";|" $FRONTEND_CONFIG_PATH
sed -i "s|export const SOCKET_BASE_URL =.*|export const SOCKET_BASE_URL = \"http://$IP_ADDRESS:5000\";|" $FRONTEND_CONFIG_PATH

# 7. Setup Apache2 to proxy the RemixJS frontend
echo "Setting up Apache2 for domain $DOMAIN_NAME..."

# Create a new Apache config file for the domain
APACHE_CONF_PATH="/etc/apache2/sites-available/$DOMAIN_NAME.conf"
sudo tee $APACHE_CONF_PATH > /dev/null <<EOF
<VirtualHost *:80>
    ServerName $DOMAIN_NAME
    DocumentRoot /var/www/html

    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    ErrorLog \${APACHE_LOG_DIR}/error.log
    CustomLog \${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF

# Enable the new site and restart Apache
sudo a2ensite $DOMAIN_NAME.conf
sudo systemctl restart apache2

# 8. Generate ENCRYPTION_KEY using Node.js
echo "Generating encryption key..."
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 9. Create .env file and add necessary environment variables
echo "Creating .env file..."
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" > .env

# 10. Modify backend code to handle the ENCRYPTION_KEY properly
echo "Updating encryption key handling in backend..."

BACKEND_ROUTES_PATH="../backend/routes/quiz.routes.js"
sed -i "s|const key = Buffer.from(process.env.ENCRYPTION_KEY, \"hex\");|const key = Buffer.from(process.env.ENCRYPTION_KEY || \"$ENCRYPTION_KEY\", \"hex\");|" $BACKEND_ROUTES_PATH

# 11. Start both frontend and backend using PM2 from the root directory
echo "Starting both frontend and backend using PM2 from the root directory..."

# Start the frontend and backend using the root `npm start` command with PM2
cd ../
pm2 start npm --name "frontend-backend" -- run start

# 12. PM2 startup and save (to ensure it starts after reboot)
echo "Setting up PM2 to restart on boot..."

pm2 startup
pm2 save

# 13. Final Instructions
echo "Setup complete!"
echo "Your platform is now running at: http://$DOMAIN_NAME or http://$IP_ADDRESS:3000"
echo "Remember to check your API and Socket Base URL if you made custom changes!"
