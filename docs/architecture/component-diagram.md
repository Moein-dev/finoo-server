# دیاگرام‌های کامپوننت سیستم

## دیاگرام کامپوننت‌های اصلی

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Application]
        MOBILE[Mobile App]
        API_CLIENT[API Clients]
    end

    subgraph "API Gateway"
        EXPRESS[Express Server]
        CORS[CORS Middleware]
        STATIC[Static File Server]
    end

    subgraph "Route Layer"
        AUTH_ROUTES[Auth Routes]
        DATA_ROUTES[Data Routes]
    end

    subgraph "Middleware Layer"
        AUTH_MW[Auth Middleware]
        RATE_MW[Rate Limit Middleware]
        UPLOAD_MW[Upload Middleware]
        ERROR_MW[Error Middleware]
    end

    subgraph "Controller Layer"
        AUTH_CTRL[Auth Controller]
        PROFILE_CTRL[Profile Controller]
    end

    subgraph "Service Layer"
        DB_SERVICE[Database Service]
        SMS_SERVICE[SMS Helper]
        EMAIL_SERVICE[Email Helper]
        RESPONSE_SERVICE[Response Handler]
    end

    subgraph "Model Layer"
        USER_MODEL[User Model]
        PRICE_MODEL[Price Model]
        CURRENCY_MODEL[Currency Model]
        CATEGORY_MODEL[Category Model]
    end

    subgraph "Data Layer"
        MYSQL[(MySQL Database)]
    end

    subgraph "External Services"
        TGJU[TGJU API]
        SMS_API[Trez SMS API]
        EMAIL_SMTP[SMTP Server]
    end

    subgraph "Background Jobs"
        CRON_JOB[Data Fetch Job]
        SCHEDULER[Node Schedule]
    end

    %% Client connections
    WEB --> EXPRESS
    MOBILE --> EXPRESS
    API_CLIENT --> EXPRESS

    %% API Gateway connections
    EXPRESS --> CORS
    EXPRESS --> STATIC
    EXPRESS --> AUTH_ROUTES
    EXPRESS --> DATA_ROUTES

    %% Route to Middleware connections
    AUTH_ROUTES --> AUTH_MW
    AUTH_ROUTES --> RATE_MW
    AUTH_ROUTES --> UPLOAD_MW
    DATA_ROUTES --> AUTH_MW

    %% Middleware to Controller connections
    AUTH_MW --> AUTH_CTRL
    AUTH_MW --> PROFILE_CTRL
    RATE_MW --> AUTH_CTRL
    UPLOAD_MW --> PROFILE_CTRL

    %% Controller to Service connections
    AUTH_CTRL --> DB_SERVICE
    AUTH_CTRL --> SMS_SERVICE
    AUTH_CTRL --> RESPONSE_SERVICE
    PROFILE_CTRL --> DB_SERVICE
    PROFILE_CTRL --> EMAIL_SERVICE
    PROFILE_CTRL --> RESPONSE_SERVICE

    %% Service to Model connections
    DB_SERVICE --> USER_MODEL
    DB_SERVICE --> PRICE_MODEL
    DB_SERVICE --> CURRENCY_MODEL
    DB_SERVICE --> CATEGORY_MODEL

    %% Model to Database connections
    USER_MODEL --> MYSQL
    PRICE_MODEL --> MYSQL
    CURRENCY_MODEL --> MYSQL
    CATEGORY_MODEL --> MYSQL

    %% External service connections
    SMS_SERVICE --> SMS_API
    EMAIL_SERVICE --> EMAIL_SMTP
    CRON_JOB --> TGJU
    CRON_JOB --> DB_SERVICE

    %% Background job connections
    SCHEDULER --> CRON_JOB

    %% Error handling
    ERROR_MW --> RESPONSE_SERVICE
```

## دیاگرام جریان احراز هویت

```mermaid
sequenceDiagram
    participant Client
    participant AuthRoute
    participant AuthMiddleware
    participant AuthController
    participant DatabaseService
    participant UserModel
    participant Database
    participant SMSService
    participant ResponseHandler

    %% Registration Flow
    Client->>AuthRoute: POST /register
    AuthRoute->>AuthController: register()
    AuthController->>DatabaseService: createUser()
    DatabaseService->>UserModel: new UserModel()
    UserModel->>Database: INSERT user
    Database-->>UserModel: user created
    UserModel-->>DatabaseService: user object
    DatabaseService-->>AuthController: user data
    AuthController->>ResponseHandler: success response
    ResponseHandler-->>Client: registration success

    %% Login with OTP Flow
    Client->>AuthRoute: POST /send-code
    AuthRoute->>AuthController: requestLoginOtp()
    AuthController->>DatabaseService: getUserByPhone()
    DatabaseService->>Database: SELECT user
    Database-->>DatabaseService: user data
    AuthController->>DatabaseService: createPhoneVerification()
    DatabaseService->>Database: INSERT verification
    AuthController->>SMSService: sendSMS()
    SMSService-->>AuthController: SMS sent
    AuthController->>ResponseHandler: success response
    ResponseHandler-->>Client: OTP sent

    Client->>AuthRoute: POST /verify-code
    AuthRoute->>AuthController: loginWithOtp()
    AuthController->>DatabaseService: getPhoneVerification()
    DatabaseService->>Database: SELECT verification
    Database-->>DatabaseService: verification data
    AuthController->>AuthController: validate OTP
    AuthController->>AuthController: generate JWT tokens
    AuthController->>DatabaseService: updateUserRefreshToken()
    DatabaseService->>Database: UPDATE user
    AuthController->>ResponseHandler: success with tokens
    ResponseHandler-->>Client: login success + tokens

    %% Protected Route Access
    Client->>AuthRoute: GET /profile (with JWT)
    AuthRoute->>AuthMiddleware: authenticateToken()
    AuthMiddleware->>AuthMiddleware: verify JWT
    AuthMiddleware->>AuthController: next() with user context
    AuthController->>DatabaseService: getUserById()
    DatabaseService->>Database: SELECT user
    Database-->>DatabaseService: user data
    DatabaseService-->>AuthController: user object
    AuthController->>ResponseHandler: user profile
    ResponseHandler-->>Client: profile data
```

## دیاگرام جریان دریافت داده

```mermaid
sequenceDiagram
    participant Client
    participant DataRoute
    participant AuthMiddleware
    participant DatabaseService
    participant PriceModel
    participant CurrencyModel
    participant Database
    participant ResponseHandler

    Client->>DataRoute: GET /prices?date=2024-01-01&page=1&limit=10
    DataRoute->>AuthMiddleware: authenticateToken()
    AuthMiddleware->>AuthMiddleware: verify JWT
    AuthMiddleware->>DataRoute: next() with user context
    
    DataRoute->>DatabaseService: getDataByDate(date, lastPrice, limit, offset)
    DatabaseService->>Database: SELECT with JOIN currencies, categories
    Database-->>DatabaseService: raw price data
    
    loop For each price record
        DatabaseService->>PriceModel: fromDatabase(row)
        PriceModel->>CurrencyModel: new CurrencyModel()
        CurrencyModel-->>PriceModel: currency object
        PriceModel-->>DatabaseService: price object
    end
    
    DatabaseService-->>DataRoute: {data, totalRecords, requestedDate}
    DataRoute->>DataRoute: calculate pagination metadata
    DataRoute->>ResponseHandler: sendSuccessResponse()
    ResponseHandler-->>Client: paginated price data
```

## دیاگرام Background Jobs

```mermaid
graph LR
    subgraph "Scheduler"
        CRON[Node-Cron Scheduler]
        SCHEDULE[Every Hour 8AM-11PM]
    end

    subgraph "Data Fetching Process"
        TIME_CHECK[Check Time Range]
        FETCH_TGJU[Fetch from TGJU APIs]
        RETRY_LOGIC[Retry with Backup URLs]
        PROCESS_DATA[Process Price Data]
        STORE_DATA[Store in Database]
    end

    subgraph "External APIs"
        TGJU1[call1.tgju.org]
        TGJU2[call2.tgju.org]
        TGJU3[call3.tgju.org]
        TGJU4[call4.tgju.org]
        TGJU5[call.tgju.org]
    end

    subgraph "Database Operations"
        GET_CURRENCIES[Get All Currencies]
        INSERT_PRICES[Insert New Prices]
        CURRENCY_MAPPING[Map Server Keys]
    end

    CRON --> SCHEDULE
    SCHEDULE --> TIME_CHECK
    TIME_CHECK --> FETCH_TGJU
    FETCH_TGJU --> TGJU1
    FETCH_TGJU --> TGJU2
    FETCH_TGJU --> TGJU3
    FETCH_TGJU --> TGJU4
    FETCH_TGJU --> TGJU5
    
    TGJU1 --> RETRY_LOGIC
    TGJU2 --> RETRY_LOGIC
    TGJU3 --> RETRY_LOGIC
    TGJU4 --> RETRY_LOGIC
    TGJU5 --> RETRY_LOGIC
    
    RETRY_LOGIC --> PROCESS_DATA
    PROCESS_DATA --> GET_CURRENCIES
    GET_CURRENCIES --> CURRENCY_MAPPING
    CURRENCY_MAPPING --> INSERT_PRICES
    INSERT_PRICES --> STORE_DATA
```

## دیاگرام امنیت و احراز هویت

```mermaid
graph TB
    subgraph "Security Layers"
        CORS_LAYER[CORS Protection]
        RATE_LAYER[Rate Limiting]
        AUTH_LAYER[JWT Authentication]
        VALIDATION_LAYER[Input Validation]
    end

    subgraph "Authentication Flow"
        LOGIN[Login Request]
        OTP_VERIFY[OTP Verification]
        JWT_GENERATE[JWT Generation]
        TOKEN_STORE[Token Storage]
    end

    subgraph "Authorization Flow"
        TOKEN_EXTRACT[Extract JWT Token]
        TOKEN_VERIFY[Verify Token Signature]
        TOKEN_DECODE[Decode User Info]
        PERMISSION_CHECK[Check Permissions]
    end

    subgraph "Security Measures"
        INPUT_SANITIZE[Input Sanitization]
        SQL_INJECTION[SQL Injection Prevention]
        FILE_VALIDATION[File Upload Validation]
        ERROR_HANDLING[Secure Error Handling]
    end

    LOGIN --> OTP_VERIFY
    OTP_VERIFY --> JWT_GENERATE
    JWT_GENERATE --> TOKEN_STORE

    TOKEN_EXTRACT --> TOKEN_VERIFY
    TOKEN_VERIFY --> TOKEN_DECODE
    TOKEN_DECODE --> PERMISSION_CHECK

    CORS_LAYER --> RATE_LAYER
    RATE_LAYER --> AUTH_LAYER
    AUTH_LAYER --> VALIDATION_LAYER

    VALIDATION_LAYER --> INPUT_SANITIZE
    INPUT_SANITIZE --> SQL_INJECTION
    SQL_INJECTION --> FILE_VALIDATION
    FILE_VALIDATION --> ERROR_HANDLING
```

## مسئولیت‌های هر کامپوننت

### 1. **Express Server**
- HTTP server management
- Middleware orchestration
- Route registration
- Static file serving
- Error handling

### 2. **Route Layer**
- URL pattern matching
- HTTP method handling
- Parameter extraction
- Controller delegation

### 3. **Middleware Layer**
- Cross-cutting concerns
- Request preprocessing
- Response postprocessing
- Security enforcement

### 4. **Controller Layer**
- Request/response handling
- Business logic coordination
- Service layer orchestration
- Data transformation

### 5. **Service Layer**
- Business logic implementation
- Data access coordination
- External service integration
- Transaction management

### 6. **Model Layer**
- Data representation
- Validation rules
- Transformation methods
- Business rules

### 7. **Database Layer**
- Data persistence
- Query execution
- Connection management
- Transaction handling