export declare const config: {
    PORT: number;
    ASSETS_DIR: string;
    DATABASE_URL: string;
    API_KEY: string;
    STORAGE_TYPE: "local" | "s3";
    LOG_LEVEL: "info" | "warn" | "error" | "debug";
    RATE_LIMIT_MAX: number;
    RATE_LIMIT_WINDOW_MS: number;
    QUEUE_CONCURRENCY: number;
    QUEUE_MAX_RETRIES: number;
    QUEUE_BACKOFF_MS: number;
    METRICS_ENABLED: boolean;
    S3_BUCKET?: string | undefined;
    S3_REGION?: string | undefined;
    S3_ACCESS_KEY_ID?: string | undefined;
    S3_SECRET_ACCESS_KEY?: string | undefined;
    GEMINI_API_KEY?: string | undefined;
};
