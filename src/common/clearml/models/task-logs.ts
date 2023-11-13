// Interface for individual log event
export interface LogEvent {
    type: string;
    level: string;
    task: string;
    worker: string;
    msg: string;
    timestamp: number;
    model_event: boolean;
    "@timestamp": string;
    metric: string;
    variant: string;
    company_id: string;
}

// Interface for task log response data
export interface TaskLogData {
    events: LogEvent[];
    returned: number;
    total: number;
}

// Interface for the complete task log response
export interface TaskLogResponse {
    meta: {
        id: string;
        trx: string;
        endpoint: {
            name: string;
            requested_version: string;
            actual_version: string;
        };
        result_code: number;
        result_subcode: number;
        result_msg: string;
        error_stack: any;
        error_data: any;
        alarms: any;
    };
    data: TaskLogData;
}

/**
 * Interface for task log request parameters.
 */
export interface TaskLogRequestParams {
    /** 
     * The ID of the task for which to fetch logs.
     */
    task: string;

    /** 
     * Optional. The amount of log events to return. Type: integer.
     */
    batch_size?: number;

    /** 
     * Optional. Epoch time in UTC ms to use as the navigation start.
     * If not provided, the reference timestamp is determined by the 'navigate_earlier' parameter.
     * - If 'navigate_earlier' is true, the reference timestamp is the last timestamp.
     * - If 'navigate_earlier' is false, the reference timestamp is the first timestamp.
     */
    from_timestamp?: number;

    /** 
     * Optional. Determines the order of log retrieval.
     * - If true, log events are retrieved from the latest to the earliest ones (in timestamp descending order, 
     *   unless 'order' is set to 'asc').
     * - If false, log events are retrieved from the earliest to the latest ones (in timestamp ascending order,
     *   unless 'order' is set to 'desc').
     * The default value is true.
     */
    navigate_earlier?: boolean;

    /** 
     * Optional. Changes the order in which log events are returned, based on the value of 'navigate_earlier'.
     * - 'asc' for ascending order.
     * - 'desc' for descending order.
     */
    order?: 'asc' | 'desc';
}
