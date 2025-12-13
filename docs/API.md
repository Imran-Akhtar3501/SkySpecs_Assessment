# API Documentation

## REST (OpenAPI)
- Swagger UI at: `http://localhost:4000/api/docs`
- Spec: `backend/openapi.yaml`

## GraphQL
- Endpoint: `http://localhost:4000/graphql`
- SDL: `backend/src/graphql/schema.graphql`
- Example query:
```graphql
query Example($id: ID!) {
  inspection(id: $id) {
    id
    date
    turbine { id name }
    findings { id category severity estimatedCost notes }
    repairPlan { id priority totalEstimatedCost createdAt }
  }
}
```
