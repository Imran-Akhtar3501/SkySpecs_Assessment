import { Server as SocketIOServer } from 'socket.io';

const sseClients = new Set<any>();
let ioServer: SocketIOServer | null = null;

export function getSseClients() {
  return sseClients;
}

export function setIOServer(io: SocketIOServer) {
  ioServer = io;
}

export function notifyPlan(inspectionId: string, planData?: any) {
  const message = JSON.stringify({ 
    type: 'repairplan:created',
    inspectionId, 
    plan: planData,
    at: new Date().toISOString() 
  });
  
  // Notify SSE clients
  for (const client of sseClients) {
    try {
      client.write(`event: repairplan:created\ndata: ${message}\n\n`);
    } catch (error) {
      // Client disconnected, remove from set
      sseClients.delete(client);
    }
  }
  
  // Notify WebSocket clients
  if (ioServer) {
    ioServer.emit('repairplan:created', JSON.parse(message));
  }
}
