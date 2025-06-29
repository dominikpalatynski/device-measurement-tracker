classdef MongoDBMeasurementAPI < handle
    % MONGODBMEASUREMENTAPI - MATLAB class for interacting with unified MongoDB measurement API
    %
    % This class provides a comprehensive interface to the unified MongoDB 
    % measurement API endpoint, supporting all filtering options available
    % in the Postman collection.
    %
    % Usage:
    %   api = MongoDBMeasurementAPI();
    %   api = MongoDBMeasurementAPI('http://your-server:8080');
    %
    % Examples:
    %   % Create API instance
    %   api = MongoDBMeasurementAPI();
    %
    %   % Test connection
    %   api.testConnection();
    %
    %   % Fetch by condition name
    %   data = api.getByCondition('pomiar_prądu_9');
    %
    %   % Fetch by device ID
    %   data = api.getByDevice('q4Z_ooBVKFJA');
    %
    %   % Complex filtering
    %   data = api.getMeasurements('DeviceId', 'q4Z_ooBVKFJA', ...
    %                             'ConditionName', 'pomiar_prądu_9', ...
    %                             'TimeRange', '-24h', ...
    %                             'Limit', 100);
    
    properties (Access = private)
        baseURL
        timeout
        verbose
    end
    
    methods
        function obj = MongoDBMeasurementAPI(baseURL, options)
            % Constructor
            % INPUT:
            %   baseURL - (optional) Base URL of the API, default: 'http://localhost:8080'
            %   options - (optional) struct with 'timeout' and 'verbose' fields
            
            if nargin < 1 || isempty(baseURL)
                obj.baseURL = 'http://localhost:8080';
            else
                obj.baseURL = baseURL;
            end
            
            if nargin < 2
                options = struct();
            end
            
            obj.timeout = getfield(options, 'timeout', 30);
            obj.verbose = getfield(options, 'verbose', false);
            
            % Remove trailing slash from baseURL
            if endsWith(obj.baseURL, '/')
                obj.baseURL = obj.baseURL(1:end-1);
            end
        end
        
        function result = testConnection(obj)
            % Test MongoDB connection
            % OUTPUT: struct with connection test results
            
            try
                url = sprintf('%s/api/mongodb/test', obj.baseURL);
                if obj.verbose
                    fprintf('Testing connection to: %s\n', url);
                end
                
                options = weboptions('Timeout', obj.timeout, 'ContentType', 'json');
                response = webread(url, options);
                
                if obj.verbose
                    if response.success
                        fprintf('✓ Connection successful\n');
                        fprintf('  Database: %s\n', response.database);
                        if isfield(response, 'collections')
                            fprintf('  Collections: %d\n', length(response.collections));
                        end
                    else
                        fprintf('❌ Connection failed: %s\n', response.message);
                    end
                end
                
                result = response;
                
            catch ME
                error('MongoDBMeasurementAPI:ConnectionError', ...
                      'Failed to test connection: %s', ME.message);
            end
        end
        
        function data = getMeasurements(obj, varargin)
            % Get measurements with flexible filtering
            % 
            % Supported parameters (Name-Value pairs):
            %   'DeviceId'         - Filter by device ID
            %   'FaultId'          - Filter by fault ID
            %   'ConditionId'      - Filter by condition ID
            %   'DataSeriesId'     - Filter by data series ID
            %   'ConditionName'    - Filter by condition name
            %   'DataSeriesValue'  - Filter by data series value
            %   'StartTime'        - Start time (ISO 8601 or timestamp)
            %   'EndTime'          - End time (ISO 8601 or timestamp)
            %   'TimeRange'        - Relative time range (e.g., '-1h', '-24h')
            %   'Limit'            - Maximum number of results
            %   'Sort'             - Sort order ('asc' or 'desc')
            
            % Parse input parameters
            p = inputParser;
            addParameter(p, 'DeviceId', '', @ischar);
            addParameter(p, 'FaultId', '', @ischar);
            addParameter(p, 'ConditionId', '', @ischar);
            addParameter(p, 'DataSeriesId', '', @ischar);
            addParameter(p, 'ConditionName', '', @ischar);
            addParameter(p, 'DataSeriesValue', '', @ischar);
            addParameter(p, 'StartTime', '', @(x) ischar(x) || isnumeric(x));
            addParameter(p, 'EndTime', '', @(x) ischar(x) || isnumeric(x));
            addParameter(p, 'TimeRange', '', @ischar);
            addParameter(p, 'Limit', [], @isnumeric);
            addParameter(p, 'Sort', '', @ischar);
            
            parse(p, varargin{:});
            params = p.Results;
            
            % Build query parameters
            queryParams = {};
            
            if ~isempty(params.DeviceId)
                queryParams{end+1} = sprintf('deviceId=%s', obj.urlEncode(params.DeviceId));
            end
            if ~isempty(params.FaultId)
                queryParams{end+1} = sprintf('faultId=%s', obj.urlEncode(params.FaultId));
            end
            if ~isempty(params.ConditionId)
                queryParams{end+1} = sprintf('conditionId=%s', obj.urlEncode(params.ConditionId));
            end
            if ~isempty(params.DataSeriesId)
                queryParams{end+1} = sprintf('dataSeriesId=%s', obj.urlEncode(params.DataSeriesId));
            end
            if ~isempty(params.ConditionName)
                queryParams{end+1} = sprintf('conditionName=%s', obj.urlEncode(params.ConditionName));
            end
            if ~isempty(params.DataSeriesValue)
                queryParams{end+1} = sprintf('dataSeriesValue=%s', obj.urlEncode(params.DataSeriesValue));
            end
            if ~isempty(params.StartTime)
                if isnumeric(params.StartTime)
                    queryParams{end+1} = sprintf('startTime=%d', params.StartTime);
                else
                    queryParams{end+1} = sprintf('startTime=%s', obj.urlEncode(params.StartTime));
                end
            end
            if ~isempty(params.EndTime)
                if isnumeric(params.EndTime)
                    queryParams{end+1} = sprintf('endTime=%d', params.EndTime);
                else
                    queryParams{end+1} = sprintf('endTime=%s', obj.urlEncode(params.EndTime));
                end
            end
            if ~isempty(params.TimeRange)
                queryParams{end+1} = sprintf('timeRange=%s', obj.urlEncode(params.TimeRange));
            end
            if ~isempty(params.Limit)
                queryParams{end+1} = sprintf('limit=%d', params.Limit);
            end
            if ~isempty(params.Sort)
                queryParams{end+1} = sprintf('sort=%s', obj.urlEncode(params.Sort));
            end
            
            % Build URL
            queryString = strjoin(queryParams, '&');
            if isempty(queryString)
                url = sprintf('%s/api/mongodb/measurements', obj.baseURL);
            else
                url = sprintf('%s/api/mongodb/measurements?%s', obj.baseURL, queryString);
            end
            
            % Make request
            data = obj.makeRequest(url);
        end
        
        function data = getByDevice(obj, deviceId, varargin)
            % Get measurements for a specific device
            data = obj.getMeasurements('DeviceId', deviceId, varargin{:});
        end
        
        function data = getByCondition(obj, conditionName, varargin)
            % Get measurements for a specific condition name
            data = obj.getMeasurements('ConditionName', conditionName, varargin{:});
        end
        
        function data = getByDataSeries(obj, dataSeriesValue, varargin)
            % Get measurements for a specific data series value
            data = obj.getMeasurements('DataSeriesValue', dataSeriesValue, varargin{:});
        end
        
        function data = getLatest(obj, varargin)
            % Get latest measurements (limit to 1 by default)
            if ~any(strcmp(varargin(1:2:end), 'Limit'))
                varargin = [varargin, {'Limit', 1}];
            end
            data = obj.getMeasurements(varargin{:});
        end
        
        function data = getLastHour(obj, varargin)
            % Get measurements from the last hour
            data = obj.getMeasurements('TimeRange', '-1h', varargin{:});
        end
        
        function data = getLast24Hours(obj, varargin)
            % Get measurements from the last 24 hours
            data = obj.getMeasurements('TimeRange', '-24h', varargin{:});
        end
        
        function data = getTimeRange(obj, startTime, endTime, varargin)
            % Get measurements for a specific time range
            data = obj.getMeasurements('StartTime', startTime, 'EndTime', endTime, varargin{:});
        end
        
        function data = getCombinedFilter(obj, deviceId, conditionName, varargin)
            % Get measurements with combined device and condition filter
            data = obj.getMeasurements('DeviceId', deviceId, 'ConditionName', conditionName, varargin{:});
        end
        
        function setVerbose(obj, verbose)
            % Enable/disable verbose output
            obj.verbose = verbose;
        end
        
        function setTimeout(obj, timeout)
            % Set request timeout in seconds
            obj.timeout = timeout;
        end
    end
    
    methods (Access = private)
        function data = makeRequest(obj, url)
            % Make HTTP request and handle response
            try
                if obj.verbose
                    fprintf('Making request to: %s\n', url);
                end
                
                options = weboptions('Timeout', obj.timeout, 'ContentType', 'json');
                response = webread(url, options);
                
                if ~isfield(response, 'success') || ~response.success
                    error('API request failed: %s', getfield(response, 'error', 'Unknown error'));
                end
                
                data = response.data;
                
                if obj.verbose
                    fprintf('✓ Received %d measurements\n', length(data));
                end
                
            catch ME
                if contains(ME.identifier, 'MATLAB:webservices')
                    error('MongoDBMeasurementAPI:RequestError', ...
                          'Failed to make request to %s\nError: %s', url, ME.message);
                else
                    rethrow(ME);
                end
            end
        end
        
        function encoded = urlEncode(obj, str)
            % Simple URL encoding
            str = char(str);
            encoded = '';
            for i = 1:length(str)
                c = str(i);
                if obj.isAlphaNumeric(c) || c == '-' || c == '_' || c == '.' || c == '~'
                    encoded = [encoded c];
                else
                    encoded = [encoded sprintf('%%%02X', double(c))];
                end
            end
        end
        
        function tf = isAlphaNumeric(obj, c)
            % Check if character is alphanumeric
            tf = (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9');
        end
    end
end

function value = getfield(s, field, default)
    % Get field value from struct with default
    if isfield(s, field)
        value = s.(field);
    else
        value = default;
    end
end