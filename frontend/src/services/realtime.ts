import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let sseEventSource: EventSource | null = null;

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    return import.meta.env.VITE_API_BASE || `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return 'http://localhost:4000';
};

export function connectWebSocket(onPlanCreated: (data: any) => void) {
  if (socket?.connected) {
    return;
  }

  const apiBase = getApiBase();
  socket = io(apiBase, {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('WebSocket connected');
  });

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
  });

  socket.on('repairplan:created', (data) => {
    console.log('Repair plan created via WebSocket:', data);
    onPlanCreated(data);
  });

  socket.on('connect_error', () => {
    console.log('WebSocket connection failed, falling back to SSE');
    connectSSE(onPlanCreated);
  });
}

export function connectSSE(onPlanCreated: (data: any) => void) {
  if (sseEventSource) {
    return;
  }

  try {
    const apiBase = getApiBase();
    sseEventSource = new EventSource(`${apiBase}/sse/repairplans`);

    sseEventSource.addEventListener('repairplan:created', (event) => {
      const data = JSON.parse(event.data);
      console.log('Repair plan created via SSE:', data);
      onPlanCreated(data);
    });

    sseEventSource.addEventListener('ping', () => {
      // Keep connection alive
    });

    sseEventSource.onerror = () => {
      console.error('SSE connection error');
      sseEventSource?.close();
      sseEventSource = null;
    };
  } catch (error) {
    console.error('Failed to connect to SSE:', error);
  }
}

export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  if (sseEventSource) {
    sseEventSource.close();
    sseEventSource = null;
  }
}

