# GraphQL Setup and Troubleshooting

## Fixed Issues

The following issues have been resolved in the Apollo Server configuration:

1. **Introspection Enabled**: Added `introspection: true` to allow Apollo Studio to discover the schema
2. **CORS Configuration**: Added `https://studio.apollographql.com` to allowed origins
3. **CSRF Prevention**: Disabled for local development (should be enabled in production)
4. **Schema Loading**: Added better error handling and fallback paths

## Chrome Local Network Access Issue

If you see the popup about Chrome blocking local network access:

### Solution 1: Chrome Settings (Recommended)

1. Open Chrome and go to: `chrome://settings/content/localNetworkAccess`
2. Ensure "Sites can ask to connect to devices on your local network" is enabled
3. If `https://studio.apollographql.com` is in the "Not allowed" section, remove it
4. Refresh the GraphQL page

### Solution 2: Use Different Browser

- Use Firefox, Edge, or Safari to access Apollo Studio
- These browsers don't have the same local network restrictions

### Solution 3: Use Apollo Studio Desktop App

- Download Apollo Studio Desktop from: https://www.apollographql.com/docs/studio/explorer/sandbox/
- This avoids browser restrictions entirely

## Verifying GraphQL is Working

### 1. Check Backend Logs

When you start the backend, you should see:
```
✅ GraphQL schema loaded from: /path/to/src/graphql/schema.graphql
📚 GraphQL: http://localhost:4000/graphql
```

### 2. Access GraphQL Endpoint

Open in browser: http://localhost:4000/graphql

You should see the Apollo Studio Sandbox interface.

### 3. Test Introspection Query

In Apollo Studio, try this query to verify introspection works:

```graphql
query IntrospectionQuery {
  __schema {
    types {
      name
      kind
    }
    queryType {
      name
      fields {
        name
        type {
          name
        }
      }
    }
    mutationType {
      name
      fields {
        name
      }
    }
  }
}
```

### 4. Test Login Mutation

```graphql
mutation Login {
  login(email: "engineer@example.com", password: "Password123!") {
    token
    user {
      id
      email
      name
      role
    }
  }
}
```

Copy the token from the response, then use it in the headers:

```json
{
  "Authorization": "Bearer YOUR_TOKEN_HERE"
}
```

### 5. Test Query (After Login)

```graphql
query GetTurbines {
  turbines(limit: 10) {
    data {
      id
      name
      manufacturer
      mwRating
    }
    total
  }
}
```

## Example GraphQL Queries

### Login
```graphql
mutation Login {
  login(email: "engineer@example.com", password: "Password123!") {
    token
    user {
      id
      email
      role
    }
  }
}
```

### Get Turbines
```graphql
query GetTurbines {
  turbines(limit: 10, offset: 0) {
    data {
      id
      name
      manufacturer
      mwRating
      lat
      lng
    }
    total
  }
}
```

### Get Single Turbine
```graphql
query GetTurbine {
  turbine(id: "TURBINE_ID_HERE") {
    id
    name
    inspections {
      id
      date
      dataSource
      findings {
        id
        category
        severity
      }
    }
  }
}
```

### Create Turbine
```graphql
mutation CreateTurbine {
  createTurbine(
    name: "Test Turbine"
    manufacturer: "TestGen"
    mwRating: 3.5
    lat: 40.7128
    lng: -74.0060
  ) {
    id
    name
    manufacturer
    mwRating
  }
}
```

### Get Inspections
```graphql
query GetInspections {
  inspections(
    turbineId: "TURBINE_ID_HERE"
    startDate: "2025-01-01"
    endDate: "2025-12-31"
    limit: 10
  ) {
    data {
      id
      date
      inspectorName
      dataSource
      findings {
        id
        category
        severity
      }
    }
    total
  }
}
```

### Create Inspection
```graphql
mutation CreateInspection {
  createInspection(
    turbineId: "TURBINE_ID_HERE"
    date: "2025-01-15"
    inspectorName: "John Doe"
    dataSource: DRONE
  ) {
    id
    date
    inspectorName
    dataSource
  }
}
```

### Create Finding
```graphql
mutation CreateFinding {
  createFinding(
    inspectionId: "INSPECTION_ID_HERE"
    category: BLADE_DAMAGE
    severity: 2
    estimatedCost: 5000
    notes: "long crack in blade"
  ) {
    id
    category
    severity
    estimatedCost
    notes
  }
}
```

### Generate Repair Plan
```graphql
mutation GenerateRepairPlan {
  generateRepairPlan(inspectionId: "INSPECTION_ID_HERE") {
    id
    priority
    totalEstimatedCost
    createdAt
    inspection {
      id
      date
      turbine {
        name
      }
    }
  }
}
```

## Troubleshooting

### Issue: "Schema not found" error

**Solution**: Ensure the schema file exists at `backend/src/graphql/schema.graphql`

### Issue: "Introspection is disabled"

**Solution**: The fix has enabled introspection. Restart the backend server.

### Issue: CORS errors in browser console

**Solution**: The fix has added Apollo Studio to CORS origins. Restart the backend server.

### Issue: Still can't see queries/mutations in Apollo Studio

**Solution**:
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check browser console for errors
4. Verify backend is running and schema loaded successfully
5. Try a different browser

### Issue: Authentication errors

**Solution**: 
- First run the `login` mutation to get a token
- Add the token to HTTP Headers in Apollo Studio:
  ```
  {
    "Authorization": "Bearer YOUR_TOKEN_HERE"
  }
  ```

## Production Considerations

For production, you should:
1. Enable CSRF prevention: `csrfPrevention: true`
2. Disable introspection: `introspection: false` (or use environment variable)
3. Restrict CORS origins to your frontend domain only
4. Use environment variables for configuration

Example production config:
```typescript
const server = new ApolloServer({
  typeDefs,
  resolvers: graphqlResolvers,
  introspection: process.env.NODE_ENV !== 'production',
  csrfPrevention: process.env.NODE_ENV === 'production',
  // ... rest of config
});
```

