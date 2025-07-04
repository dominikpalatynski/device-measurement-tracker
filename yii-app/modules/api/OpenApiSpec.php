<?php

namespace app\modules\api;

/**
 * @OA\Info(
 *     version="1.0.0",
 *     title="IoT Monitoring API",
 *     description="API for IoT device monitoring and fault management",
 *     @OA\Contact(
 *         email="support@iot-monitoring.com"
 *     )
 * )
 * @OA\Server(
 *     url="/api",
 *     description="API Server"
 * )
 * @OA\SecurityScheme(
 *     securityScheme="BearerAuth",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     description="Enter JWT Bearer token"
 * )
 * @OA\SecurityScheme(
 *     securityScheme="BatchAuth",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     description="Enter JWT Batch token for device measurement operations"
 * )
 * @OA\Tag(
 *     name="Authentication",
 *     description="User authentication operations"
 * )
 * @OA\Tag(
 *     name="Devices",
 *     description="Device management operations"
 * )
 * @OA\Tag(
 *     name="Faults",
 *     description="Fault management operations"
 * )
 * @OA\Tag(
 *     name="Conditions",
 *     description="Condition management operations"
 * )
 * @OA\Tag(
 *     name="Measurements",
 *     description="Measurement data operations"
 * )
 * @OA\Tag(
 *     name="Users",
 *     description="User management operations"
 * )
 * 
 * Common response schemas
 * @OA\Schema(
 *     schema="SuccessResponse",
 *     type="object",
 *     @OA\Property(property="success", type="boolean", example=true),
 *     @OA\Property(property="message", type="string", example="Operation completed successfully"),
 *     @OA\Property(property="data", type="object")
 * )
 * @OA\Schema(
 *     schema="ErrorResponse",
 *     type="object",
 *     @OA\Property(property="success", type="boolean", example=false),
 *     @OA\Property(property="message", type="string", example="An error occurred"),
 *     @OA\Property(property="errors", type="object")
 * )
 * @OA\Schema(
 *     schema="ValidationErrorResponse",
 *     type="object",
 *     @OA\Property(property="success", type="boolean", example=false),
 *     @OA\Property(property="message", type="string", example="Validation failed"),
 *     @OA\Property(
 *         property="errors",
 *         type="object",
 *         @OA\Property(property="field_name", type="array", @OA\Items(type="string"))
 *     )
 * )
 * 
 * Device related schemas
 * @OA\Schema(
 *     schema="Device",
 *     type="object",
 *     @OA\Property(property="device_id", type="string", example="DEV001"),
 *     @OA\Property(property="device_name", type="string", example="Temperature Sensor 1"),
 *     @OA\Property(property="device_type", type="string", example="sensor"),
 *     @OA\Property(property="status", type="string", enum={"Active", "Inactive"}, example="Active"),
 *     @OA\Property(property="location", type="string", example="Building A, Room 101"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 * @OA\Schema(
 *     schema="DeviceList",
 *     type="object",
 *     @OA\Property(property="success", type="boolean", example=true),
 *     @OA\Property(property="message", type="string", example="Devices retrieved successfully"),
 *     @OA\Property(
 *         property="data",
 *         type="array",
 *         @OA\Items(ref="#/components/schemas/Device")
 *     )
 * )
 * 
 * Fault related schemas
 * @OA\Schema(
 *     schema="Fault",
 *     type="object",
 *     @OA\Property(property="fault_id", type="string", example="FAULT001"),
 *     @OA\Property(property="fault_name", type="string", example="Overheating Issue"),
 *     @OA\Property(property="device_id", type="string", example="DEV001"),
 *     @OA\Property(property="status", type="string", enum={"Active", "Inactive", "Resolved"}, example="Active"),
 *     @OA\Property(property="severity", type="string", enum={"Low", "Medium", "High", "Critical"}, example="High"),
 *     @OA\Property(property="description", type="string", example="Device temperature exceeds normal range"),
 *     @OA\Property(property="start_date", type="string", format="date-time"),
 *     @OA\Property(property="end_date", type="string", format="date-time", nullable=true),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 * @OA\Schema(
 *     schema="FaultList",
 *     type="object",
 *     @OA\Property(property="success", type="boolean", example=true),
 *     @OA\Property(property="message", type="string", example="Faults retrieved successfully"),
 *     @OA\Property(
 *         property="data",
 *         type="array",
 *         @OA\Items(ref="#/components/schemas/Fault")
 *     )
 * )
 * 
 * Condition related schemas
 * @OA\Schema(
 *     schema="Condition",
 *     type="object",
 *     @OA\Property(property="condition_id", type="string", example="COND001"),
 *     @OA\Property(property="name", type="string", example="Temperature Monitoring"),
 *     @OA\Property(property="fault_id", type="string", example="FAULT001"),
 *     @OA\Property(property="status", type="string", enum={"Active", "Inactive", "Finished"}, example="Active"),
 *     @OA\Property(property="description", type="string", example="Monitor temperature every 5 minutes"),
 *     @OA\Property(property="parameters", type="object"),
 *     @OA\Property(property="start_time", type="string", format="date-time"),
 *     @OA\Property(property="end_time", type="string", format="date-time", nullable=true),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 * @OA\Schema(
 *     schema="ConditionList",
 *     type="object",
 *     @OA\Property(property="success", type="boolean", example=true),
 *     @OA\Property(property="message", type="string", example="Conditions retrieved successfully"),
 *     @OA\Property(
 *         property="data",
 *         type="array",
 *         @OA\Items(ref="#/components/schemas/Condition")
 *     )
 * )
 * 
 * Measurement related schemas
 * @OA\Schema(
 *     schema="Measurement",
 *     type="object",
 *     @OA\Property(property="measurement_id", type="string", example="MEAS001"),
 *     @OA\Property(property="device_id", type="string", example="DEV001"),
 *     @OA\Property(property="timestamp", type="string", format="date-time"),
 *     @OA\Property(
 *         property="data",
 *         type="object",
 *         @OA\Property(property="temperature", type="number", format="float", example=25.5),
 *         @OA\Property(property="humidity", type="number", format="float", example=60.2),
 *         @OA\Property(property="voltage", type="number", format="float", example=220.0),
 *         @OA\Property(property="current", type="number", format="float", example=5.2),
 *         @OA\Property(property="power", type="number", format="float", example=1144.0)
 *     ),
 *     @OA\Property(property="quality", type="string", enum={"Good", "Fair", "Poor"}, example="Good")
 * )
 * @OA\Schema(
 *     schema="MeasurementList",
 *     type="object",
 *     @OA\Property(property="success", type="boolean", example=true),
 *     @OA\Property(property="message", type="string", example="Measurements retrieved successfully"),
 *     @OA\Property(
 *         property="data",
 *         type="array",
 *         @OA\Items(ref="#/components/schemas/Measurement")
 *     ),
 *     @OA\Property(property="pagination", type="object",
 *         @OA\Property(property="total", type="integer", example=1000),
 *         @OA\Property(property="page", type="integer", example=1),
 *         @OA\Property(property="limit", type="integer", example=50),
 *         @OA\Property(property="pages", type="integer", example=20)
 *     )
 * )
 * 
 * User related schemas
 * @OA\Schema(
 *     schema="User",
 *     type="object",
 *     @OA\Property(property="user_id", type="integer", example=1),
 *     @OA\Property(property="username", type="string", example="admin"),
 *     @OA\Property(property="email", type="string", format="email", example="admin@example.com"),
 *     @OA\Property(property="role", type="string", enum={"admin", "operator", "viewer"}, example="admin"),
 *     @OA\Property(property="status", type="string", enum={"Active", "Inactive"}, example="Active"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 * @OA\Schema(
 *     schema="UserList",
 *     type="object",
 *     @OA\Property(property="success", type="boolean", example=true),
 *     @OA\Property(property="message", type="string", example="Users retrieved successfully"),
 *     @OA\Property(
 *         property="data",
 *         type="array",
 *         @OA\Items(ref="#/components/schemas/User")
 *     )
 * )
 * @OA\Schema(
 *     schema="AuthResponse",
 *     type="object",
 *     @OA\Property(property="success", type="boolean", example=true),
 *     @OA\Property(property="message", type="string", example="Login successful"),
 *     @OA\Property(
 *         property="data",
 *         type="object",
 *         @OA\Property(property="token", type="string", example="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."),
 *         @OA\Property(property="expires_at", type="string", format="date-time"),
 *         @OA\Property(property="user", ref="#/components/schemas/User")
 *     )
 * )
 * 
 * Common parameters
 * @OA\Parameter(
 *     parameter="DeviceIdPath",
 *     name="deviceId",
 *     in="path",
 *     required=true,
 *     description="Device ID",
 *     @OA\Schema(type="string", example="DEV001")
 * )
 * @OA\Parameter(
 *     parameter="FaultIdPath",
 *     name="faultId",
 *     in="path",
 *     required=true,
 *     description="Fault ID",
 *     @OA\Schema(type="string", example="FAULT001")
 * )
 * @OA\Parameter(
 *     parameter="ConditionIdPath",
 *     name="conditionId",
 *     in="path",
 *     required=true,
 *     description="Condition ID",
 *     @OA\Schema(type="string", example="COND001")
 * )
 * @OA\Parameter(
 *     parameter="UserIdPath",
 *     name="userId",
 *     in="path",
 *     required=true,
 *     description="User ID",
 *     @OA\Schema(type="integer", example=1)
 * )
 * @OA\Parameter(
 *     parameter="LimitQuery",
 *     name="limit",
 *     in="query",
 *     description="Number of items to return",
 *     @OA\Schema(type="integer", minimum=1, maximum=1000, default=50)
 * )
 * @OA\Parameter(
 *     parameter="OffsetQuery",
 *     name="offset",
 *     in="query",
 *     description="Number of items to skip",
 *     @OA\Schema(type="integer", minimum=0, default=0)
 * )
 * @OA\Parameter(
 *     parameter="TimeRangeQuery",
 *     name="timeRange",
 *     in="query",
 *     description="Time range for filtering (e.g., '1h', '24h', '7d')",
 *     @OA\Schema(type="string", enum={"1h", "6h", "12h", "24h", "7d", "30d"}, example="24h")
 * )
 * 
 * Live monitoring schemas
 * @OA\Schema(
 *     schema="LiveFault",
 *     type="object",
 *     @OA\Property(property="fault_id", type="string", example="LIVE_FAULT_001"),
 *     @OA\Property(property="device_id", type="string", example="DEV001"),
 *     @OA\Property(property="status", type="string", enum={"Active", "Stopped"}, example="Active"),
 *     @OA\Property(property="conditions", type="array", @OA\Items(ref="#/components/schemas/Condition")),
 *     @OA\Property(property="started_at", type="string", format="date-time"),
 *     @OA\Property(property="last_measurement_at", type="string", format="date-time")
 * )
 * @OA\Schema(
 *     schema="MeasurementChannel",
 *     type="object",
 *     @OA\Property(property="channel_id", type="string", example="CH001"),
 *     @OA\Property(property="device_id", type="string", example="DEV001"),
 *     @OA\Property(property="channel_name", type="string", example="Temperature"),
 *     @OA\Property(property="unit", type="string", example="°C"),
 *     @OA\Property(property="data_type", type="string", enum={"numeric", "boolean", "text"}, example="numeric"),
 *     @OA\Property(property="min_value", type="number", format="float"),
 *     @OA\Property(property="max_value", type="number", format="float"),
 *     @OA\Property(property="calibration_offset", type="number", format="float", example=0.0),
 *     @OA\Property(property="calibration_scale", type="number", format="float", example=1.0),
 *     @OA\Property(property="active", type="boolean", example=true)
 * )
 * @OA\Schema(
 *     schema="DataSeries",
 *     type="object",
 *     @OA\Property(property="series_id", type="string", example="SERIES_001"),
 *     @OA\Property(property="name", type="string", example="Voltage Phase A"),
 *     @OA\Property(property="device_id", type="string", example="DEV001"),
 *     @OA\Property(property="fault_id", type="string", example="FAULT001"),
 *     @OA\Property(property="condition_id", type="string", example="COND001"),
 *     @OA\Property(property="data_type", type="string", example="voltage"),
 *     @OA\Property(property="unit", type="string", example="V"),
 *     @OA\Property(property="sample_count", type="integer", example=1000),
 *     @OA\Property(property="created_at", type="string", format="date-time")
 * )
 */
class OpenApiSpec
{
    // This class only exists to hold OpenAPI annotations
}
