function [measurements, metadata] = fetch_measurements_by_condition(condition_name, varargin)
% FETCH_MEASUREMENTS_BY_CONDITION - Fetch measurement data by condition name from MongoDB API
%
% Syntax:
%   [measurements, metadata] = fetch_measurements_by_condition(condition_name)
%   [measurements, metadata] = fetch_measurements_by_condition(condition_name, 'Parameter', Value, ...)
%
% Description:
%   Fetches measurement data from the unified MongoDB API endpoint based on condition name.
%   Returns structured data ready for analysis in MATLAB.
%
% Input Arguments:
%   condition_name - String: Name of the condition to filter by (required)
%                   Example: 'pomiar_prądu_9'
%
% Optional Parameters (Name-Value pairs):
%   'BaseURL'     - String: Base URL of the API (default: 'http://localhost:8080')
%   'DeviceId'    - String: Additional filter by device ID
%   'DataSeries'  - String: Additional filter by data series value
%   'Limit'       - Integer: Maximum number of results (default: 100)
%   'TimeRange'   - String: Relative time range (e.g., '-1h', '-24h', '-1w')
%   'StartTime'   - String/Number: Start time for filtering (ISO 8601 or timestamp)
%   'EndTime'     - String/Number: End time for filtering (ISO 8601 or timestamp)
%   'Sort'        - String: Sort order ('asc' or 'desc', default: 'desc')
%   'Timeout'     - Number: Request timeout in seconds (default: 30)
%   'Verbose'     - Logical: Enable verbose output (default: false)
%
% Output Arguments:
%   measurements - Struct array: Measurement data with fields like timestamp, values, etc.
%   metadata     - Struct: API response metadata (count, filters, etc.)
%
% Examples:
%   % Basic usage - fetch by condition name only
%   [data, meta] = fetch_measurements_by_condition('pomiar_prądu_9');
%
%   % Fetch with additional filters
%   [data, meta] = fetch_measurements_by_condition('pomiar_prądu_9', ...
%       'DeviceId', 'q4Z_ooBVKFJA', 'Limit', 50);
%
%   % Fetch last 24 hours of data
%   [data, meta] = fetch_measurements_by_condition('pomiar_prądu_9', ...
%       'TimeRange', '-24h', 'Verbose', true);
%
%   % Custom time range
%   [data, meta] = fetch_measurements_by_condition('pomiar_prądu_9', ...
%       'StartTime', '2024-01-01T00:00:00Z', ...
%       'EndTime', '2024-01-02T00:00:00Z');
%
% Author: Device Measurement Tracker Team
% Date: June 2025
% Version: 1.0

    % Input validation
    if nargin < 1 || isempty(condition_name)
        error('fetch_measurements_by_condition:InvalidInput', ...
              'condition_name is required');
    end
    
    % Parse input parameters
    p = inputParser;
    addRequired(p, 'condition_name', @ischar);
    addParameter(p, 'BaseURL', 'http://localhost:8080', @ischar);
    addParameter(p, 'DeviceId', '', @ischar);
    addParameter(p, 'DataSeries', '', @ischar);
    addParameter(p, 'Limit', 100, @isnumeric);
    addParameter(p, 'TimeRange', '', @ischar);
    addParameter(p, 'StartTime', '', @(x) ischar(x) || isnumeric(x));
    addParameter(p, 'EndTime', '', @(x) ischar(x) || isnumeric(x));
    addParameter(p, 'Sort', 'desc', @ischar);
    addParameter(p, 'Timeout', 30, @isnumeric);
    addParameter(p, 'Verbose', false, @islogical);
    
    parse(p, condition_name, varargin{:});
    params = p.Results;
    
    % Build API URL and parameters
    base_url = params.BaseURL;
    endpoint = '/api/mongodb/measurements';
    full_url = sprintf('%s%s', base_url, endpoint);
    
    % Build query parameters as struct, only including non-empty values
    query_struct = struct();
    query_struct.conditionName = condition_name;
    
    if ~isempty(params.DeviceId)
        query_struct.deviceId = params.DeviceId;
    end
    
    if ~isempty(params.DataSeries)
        query_struct.dataSeriesValue = params.DataSeries;
    end
    
    if ~isempty(params.Limit) && params.Limit > 0
        query_struct.limit = params.Limit;
    end
    
    if ~isempty(params.TimeRange)
        query_struct.timeRange = params.TimeRange;
    end
    
    if ~isempty(params.StartTime)
        if isnumeric(params.StartTime)
            query_struct.startTime = params.StartTime;
        else
            query_struct.startTime = params.StartTime;
        end
    end
    
    if ~isempty(params.EndTime)
        if isnumeric(params.EndTime)
            query_struct.endTime = params.EndTime;
        else
            query_struct.endTime = params.EndTime;
        end
    end
    
    if ~isempty(params.Sort)
        query_struct.sort = params.Sort;
    end
    
    if params.Verbose
        fprintf('Making API request to: %s\n', full_url);
        fprintf('Query parameters:\n');
        fields = fieldnames(query_struct);
        for i = 1:length(fields)
            value = query_struct.(fields{i});
            if isnumeric(value)
                fprintf('  %s = %g\n', fields{i}, value);
            else
                fprintf('  %s = %s\n', fields{i}, value);
            end
        end
    end
    
    try
        % Configure web options with better browser-like headers
        options = weboptions('Timeout', params.Timeout, ...
                           'ContentType', 'json', ...
                           'RequestMethod', 'GET', ...
                           'HeaderFields', {'User-Agent', 'MATLAB/WebClient'; ...
                                          'Accept', 'application/json, text/plain, */*'; ...
                                          'Accept-Language', 'en-US,en;q=0.9'});
        
        % Make the API request
        if params.Verbose
            fprintf('Fetching measurements for condition: %s\n', condition_name);
        end
        
        % Try the struct method first
        try
            response = webread(full_url, query_struct, options);
        catch structError
            if params.Verbose
                fprintf('Query struct method failed: %s\n', structError.message);
                fprintf('Trying manual URL construction...\n');
            end
            
            % Fallback to manual URL construction
            query_parts = {};
            fields = fieldnames(query_struct);
            for i = 1:length(fields)
                value = query_struct.(fields{i});
                if isnumeric(value)
                    query_parts{end+1} = sprintf('%s=%g', fields{i}, value);
                else
                    % Simple URL encoding for common characters
                    encoded_value = strrep(value, ' ', '%20');
                    encoded_value = strrep(encoded_value, '+', '%2B');
                    query_parts{end+1} = sprintf('%s=%s', fields{i}, encoded_value);
                end
            end
            
            manual_url = sprintf('%s?%s', full_url, strjoin(query_parts, '&'));
            if params.Verbose
                fprintf('Manual URL: %s\n', manual_url);
            end
            
            response = webread(manual_url, options);
        end
        
        % Check if response is successful
        if ~isfield(response, 'success') || ~response.success
            error('fetch_measurements_by_condition:APIError', ...
                  'API request failed: %s', response.error);
        end
        
        % Extract measurements data
        if isfield(response, 'data') && ~isempty(response.data)
            measurements = response.data;
            
            % Convert cell array to struct array if needed
            if iscell(measurements)
                measurements = [measurements{:}];
            end
            
            % Process timestamps if present
            measurements = process_timestamps(measurements);
            
        else
            measurements = [];
            if params.Verbose
                fprintf('No measurements found for condition: %s\n', condition_name);
            end
        end
        
        % Extract metadata
        metadata = struct();
        metadata.count = response.count;
        metadata.filters = response.filters;
        metadata.timestamp = response.timestamp;
        metadata.request_url = sprintf('%s?%s', full_url, urlencode_struct(query_struct));
        metadata.condition_name = condition_name;
        
        if params.Verbose
            fprintf('Successfully fetched %d measurements\n', metadata.count);
            fprintf('API response timestamp: %s\n', metadata.timestamp);
        end
        
    catch ME
        if contains(ME.identifier, 'MATLAB:webservices')
            error('fetch_measurements_by_condition:ConnectionError', ...
                  'Failed to connect to API. Check if server is running at %s\nError: %s', ...
                  base_url, ME.message);
        else
            rethrow(ME);
        end
    end
end

function measurements = process_timestamps(measurements)
    % Process timestamp fields and convert to MATLAB datetime if possible
    if isempty(measurements)
        return;
    end
    
    % Check if measurements is a struct array
    if isstruct(measurements)
        field_names = fieldnames(measurements);
        timestamp_fields = {'timestamp', 'created_at', 'time', 'date'};
        
        for i = 1:length(measurements)
            for j = 1:length(timestamp_fields)
                field = timestamp_fields{j};
                if ismember(field, field_names) && isfield(measurements(i), field)
                    try
                        ts_value = measurements(i).(field);
                        if isnumeric(ts_value)
                            % Unix timestamp
                            measurements(i).([field '_datetime']) = datetime(ts_value, 'ConvertFrom', 'posixtime');
                        elseif ischar(ts_value) || isstring(ts_value)
                            % ISO 8601 string
                            measurements(i).([field '_datetime']) = datetime(ts_value, 'InputFormat', 'yyyy-MM-dd''T''HH:mm:ss''Z''');
                        end
                    catch
                        % Skip conversion if it fails
                    end
                end
            end
        end
    end
end

% Helper function for URL encoding
function encoded = urlencode(str)
    % Improved URL encoding for MATLAB that handles international characters
    try
        % Try using MATLAB's built-in urlencode if available (R2020a+)
        encoded = matlab.net.internal.urlencode(str);
    catch
        % Fallback for older MATLAB versions
        str = char(str);
        encoded = '';
        for i = 1:length(str)
            c = str(i);
            if isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~'
                encoded = [encoded c];
            else
                % Convert to UTF-8 bytes and encode each byte
                try
                    bytes = unicode2native(c, 'UTF-8');
                    for j = 1:length(bytes)
                        encoded = [encoded sprintf('%%%02X', bytes(j))];
                    end
                catch
                    % Simple fallback for single byte
                    encoded = [encoded sprintf('%%%02X', double(c))];
                end
            end
        end
    end
end

function tf = isalnum(c)
    % Check if character is alphanumeric
    tf = (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9');
end

function encoded = urlencode_struct(s)
    % Convert struct to URL encoded query string for display purposes
    fields = fieldnames(s);
    parts = {};
    for i = 1:length(fields)
        value = s.(fields{i});
        if isnumeric(value)
            parts{end+1} = sprintf('%s=%s', fields{i}, string(value));
        else
            parts{end+1} = sprintf('%s=%s', fields{i}, string(value));
        end
    end
    encoded = strjoin(parts, '&');
end