/**
 * Wire protocol types for the Intent Space.
 * Matches the ITP message format from @differ/itp.
 */

export type ITPMessageType =
  | 'INTENT'
  | 'PROMISE'
  | 'ACCEPT'
  | 'DECLINE'
  | 'COMPLETE'
  | 'ASSESS'
  | 'REVISE'
  | 'RELEASE'

export type AssessmentResult = 'FULFILLED' | 'BROKEN'

export interface ITPPayload {
  content?: string
  criteria?: string
  reason?: string
  assessment?: AssessmentResult
  revisedContent?: string
  plan?: string
  filesChanged?: string[]
  summary?: string
  [key: string]: unknown
}

/** Outbound ITP message (client -> space) */
export interface ITPMessage {
  type: ITPMessageType
  intentId?: string
  promiseId?: string
  parentId?: string
  senderId: string
  timestamp: number
  payload: ITPPayload
}

/** Stored message with sequence number (space -> client echo) */
export interface StoredMessage {
  type: string
  intentId?: string
  promiseId?: string
  parentId: string
  senderId: string
  payload: ITPPayload
  seq: number
  timestamp: number
}

/** SCAN request (client -> space, private) */
export interface ScanRequest {
  type: 'SCAN'
  spaceId: string
  since?: number
}

/** SCAN response (space -> client) */
export interface ScanResult {
  type: 'SCAN_RESULT'
  spaceId: string
  messages: StoredMessage[]
  latestSeq: number
}

/** Error from the space */
export interface SpaceError {
  type: 'ERROR'
  message: string
}

/** Echo: ITP message with seq attached */
export type MessageEcho = ITPMessage & { seq: number }

/** All possible server -> client messages */
export type ServerMessage = MessageEcho | ScanResult | SpaceError

/** All possible client -> server messages */
export type ClientMessage = ITPMessage | ScanRequest

/* ============ UI-specific types ============ */

/** Node in the fractal tree for visualization */
export interface TreeNode {
  id: string
  type: ITPMessageType
  content: string
  senderId: string
  parentId: string
  seq: number
  timestamp: number
  children: TreeNode[]
}

/** SSE event pushed to the browser */
export interface SSEEvent {
  type: 'message' | 'scan_result' | 'error' | 'connected'
  data: StoredMessage | StoredMessage[] | string
}

/** Connection status for the UI */
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected'
