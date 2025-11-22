# Swagger API Documentation Guide

## 🎉 Swagger Successfully Integrated!

Your Expense Tracker API now has complete interactive documentation powered by Swagger UI.

## 🚀 How to Access

1. **Start your server:**
   ```bash
   npm run dev
   ```

2. **Open your browser and navigate to:**
   ```
   http://localhost:3000/api-docs
   ```

## 📖 Using Swagger UI

### Testing Endpoints

1. **Find the endpoint** you want to test in the Swagger UI
2. Click on the endpoint to expand it
3. Click the **"Try it out"** button
4. Fill in the required parameters/body
5. Click **"Execute"**
6. View the response below

### Authentication

For protected endpoints (marked with a lock icon 🔒):

1. First, **register** or **login** through Swagger:
   - Go to `POST /api/v1/users/register` or `POST /api/v1/users/login`
   - Click "Try it out"
   - Fill in the request body
   - Click "Execute"
   - Copy the `token` from the response

2. **Authorize your requests:**
   - Click the **"Authorize"** button at the top of the page
   - In the "Value" field, enter: `Bearer YOUR_TOKEN_HERE`
   - Click "Authorize"
   - Click "Close"

3. Now all requests will include your authentication token!

## 📋 What's Documented

### ✅ Complete Documentation for:

- **Users** - Registration, login, user management
- **Teams** - Team creation and management
- **Categories** - Expense category management
- **Expenses** - Expense tracking and filtering
- **Reports** - Report generation and management

### 📝 Each Endpoint Includes:

- **Description** - What the endpoint does
- **Parameters** - Required and optional parameters
- **Request Body** - Expected JSON structure with examples
- **Responses** - Possible response codes and formats
- **Authentication** - Whether a JWT token is required
- **Try it out** - Test the endpoint directly from the browser

## 🎨 Swagger Features

### 1. **Interactive Testing**
Test all endpoints directly from your browser without using Postman or cURL.

### 2. **Schema Validation**
See exactly what data structure is expected for each request.

### 3. **Response Examples**
View real examples of what the API returns.

### 4. **Authentication Testing**
Easily test protected endpoints with JWT authentication.

### 5. **Export Options**
Download the API specification in JSON or YAML format.

## 📁 Files Created

- **`swagger.js`** - Swagger configuration and schema definitions
- **Updated all route files** - Added JSDoc comments for documentation
- **`server.js`** - Integrated Swagger UI middleware
- **`README.md`** - Project documentation
- **`SWAGGER_GUIDE.md`** - This guide

## 🔧 Customization

### Modify Swagger Configuration

Edit `swagger.js` to customize:
- API title and description
- Server URLs
- Contact information
- Schema definitions
- Security schemes

### Update Route Documentation

Edit the JSDoc comments in route files (`app/routes/*.js`) to update endpoint documentation.

## 📝 Example Workflow

### 1. Register a User
```
POST /api/v1/users/register
{
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

### 2. Copy the Token
Response will include a JWT token.

### 3. Authorize
Click "Authorize" and enter: `Bearer YOUR_TOKEN`

### 4. Use Protected Endpoints
Now you can test endpoints like:
- `GET /api/v1/users` - Get all users
- `GET /api/v1/users/:id` - Get specific user

## 🎯 Benefits

✅ **No Postman needed** - Test API directly from browser  
✅ **Always up-to-date** - Documentation updates with code  
✅ **Easy sharing** - Share URL with team members  
✅ **Better collaboration** - Frontend devs can see exact API structure  
✅ **Professional** - Industry-standard documentation format  

## 🌐 Production Deployment

When deploying to production:

1. Update the server URL in `swagger.js`:
   ```javascript
   servers: [
     {
       url: 'https://api.yourproduction.com',
       description: 'Production server'
     },
     {
       url: 'http://localhost:3000',
       description: 'Development server'
     }
   ]
   ```

2. Consider adding authentication to the `/api-docs` route if needed.

## 📚 Additional Resources

- [Swagger Documentation](https://swagger.io/docs/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc)
- [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express)

---

**Happy Testing! 🚀**

