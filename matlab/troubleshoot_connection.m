% TROUBLESHOOT MONGODB API CONNECTION
% This script helps diagnose connection issues between MATLAB and the MongoDB API

%% Configuration
BASE_URL = 'https://5ca5-46-205-204-72.ngrok-free.app';  % Updated to your ngrok URL
CONDITION_NAME = 'pomiar_prądu_9';
DEVICE_ID = 'q4Z_ooBVKFJA';

fprintf('=== MongoDB API Connection Troubleshooting ===\n\n');

%% Test 1: Basic server connectivity
fprintf('1. Testing basic server connectivity...\n');
try
    % Test if server responds at all
    test_url = sprintf('%s/api/mongodb/test', BASE_URL);
    fprintf('   Testing: %s\n', test_url);
    
    options = weboptions('Timeout', 10, 'RequestMethod', 'GET');
    response = webread(test_url, options);
    
    if isstruct(response) && isfield(response, 'success')
        if response.success
            fprintf('   ✓ Server is responding and MongoDB test passed\n');
            fprintf('   Database: %s\n', getfield(response, 'database', 'Unknown'));
        else
            fprintf('   ⚠ Server responding but MongoDB test failed: %s\n', getfield(response, 'message', 'Unknown error'));
        end
    else
        fprintf('   ⚠ Server responding but unexpected response format\n');
        disp(response);
    end
    
catch ME
    fprintf('   ❌ Server connectivity failed: %s\n', ME.message);
    fprintf('   Make sure the server is running at %s\n', BASE_URL);
    return; % Exit if can't reach server
end

%% Test 2: Test measurements endpoint without parameters
fprintf('\n2. Testing measurements endpoint without parameters...\n');
try
    test_url = sprintf('%s/api/mongodb/measurements', BASE_URL);
    fprintf('   Testing: %s\n', test_url);
    
    options = weboptions('Timeout', 15, 'RequestMethod', 'GET');
    response = webread(test_url, options);
    
    if isstruct(response) && isfield(response, 'success')
        if response.success
            fprintf('   ✓ Measurements endpoint working\n');
            fprintf('   Retrieved %d measurements\n', getfield(response, 'count', 0));
        else
            fprintf('   ❌ Measurements endpoint error: %s\n', getfield(response, 'error', 'Unknown error'));
        end
    else
        fprintf('   ⚠ Unexpected response format from measurements endpoint\n');
        disp(response);
    end
    
catch ME
    fprintf('   ❌ Measurements endpoint failed: %s\n', ME.message);
end

%% Test 3: Test with simple parameters using webread query struct
fprintf('\n3. Testing with simple parameters (webread query struct method)...\n');
try
    base_url = sprintf('%s/api/mongodb/measurements', BASE_URL);
    
    % Use struct for query parameters (MATLAB handles encoding)
    query = struct();
    query.limit = 5;
    
    fprintf('   URL: %s\n', base_url);
    fprintf('   Query params: limit=5\n');
    
    options = weboptions('Timeout', 15, 'RequestMethod', 'GET');
    response = webread(base_url, query, options);
    
    if response.success
        fprintf('   ✓ Simple parameters working\n');
        fprintf('   Retrieved %d measurements\n', response.count);
    else
        fprintf('   ❌ Simple parameters failed: %s\n', getfield(response, 'error', 'Unknown'));
    end
    
catch ME
    fprintf('   ❌ Simple parameters test failed: %s\n', ME.message);
end

%% Test 4: Test with condition name using different methods
fprintf('\n4. Testing condition name parameter with different methods...\n');

% Method A: Using query struct (recommended)
fprintf('   Method A: Query struct...\n');
try
    base_url = sprintf('%s/api/mongodb/measurements', BASE_URL);
    
    query = struct();
    query.conditionName = CONDITION_NAME;
    query.limit = 10;
    
    fprintf('   Condition: %s\n', CONDITION_NAME);
    
    options = weboptions('Timeout', 15, 'RequestMethod', 'GET');
    response = webread(base_url, query, options);
    
    if response.success
        fprintf('   ✓ Method A successful: %d measurements\n', response.count);
    else
        fprintf('   ❌ Method A failed: %s\n', getfield(response, 'error', 'Unknown'));
    end
    
catch ME
    fprintf('   ❌ Method A error: %s\n', ME.message);
end

% Method B: Manual URL construction with no encoding
fprintf('   Method B: Manual URL (no encoding)...\n');
try
    manual_url = sprintf('%s/api/mongodb/measurements?conditionName=%s&limit=10', ...
                        BASE_URL, CONDITION_NAME);
    fprintf('   Full URL: %s\n', manual_url);
    
    options = weboptions('Timeout', 15, 'RequestMethod', 'GET');
    response = webread(manual_url, options);
    
    if response.success
        fprintf('   ✓ Method B successful: %d measurements\n', response.count);
    else
        fprintf('   ❌ Method B failed: %s\n', getfield(response, 'error', 'Unknown'));
    end
    
catch ME
    fprintf('   ❌ Method B error: %s\n', ME.message);
end

% Method C: Using the debug function
fprintf('   Method C: Debug function...\n');
try
    [measurements, metadata] = fetch_measurements_by_condition_debug(CONDITION_NAME, ...
        'BaseURL', BASE_URL, 'Limit', 10);
    
    if ~isempty(measurements)
        fprintf('   ✓ Method C successful: %d measurements\n', length(measurements));
    else
        fprintf('   ⚠ Method C returned no data\n');
    end
    
catch ME
    fprintf('   ❌ Method C error: %s\n', ME.message);
end

%% Test 5: Browser URL test
fprintf('\n5. Browser comparison test...\n');
browser_url = sprintf('%s/api/mongodb/measurements?conditionName=%s&limit=5', ...
                     BASE_URL, CONDITION_NAME);
fprintf('   Try this URL in your browser:\n');
fprintf('   %s\n', browser_url);
fprintf('   If it works in browser but not MATLAB, there may be a user-agent or header issue.\n');

%% Test 6: Character encoding test
fprintf('\n6. Character encoding test...\n');
fprintf('   Original condition name: %s\n', CONDITION_NAME);
fprintf('   Character codes: ');
for i = 1:length(CONDITION_NAME)
    fprintf('%d ', double(CONDITION_NAME(i)));
end
fprintf('\n');

% Test different encoding methods
try
    % Method 1: MATLAB's built-in (if available)
    try
        encoded1 = matlab.net.internal.urlencode(CONDITION_NAME);
        fprintf('   MATLAB built-in encoding: %s\n', encoded1);
    catch
        fprintf('   MATLAB built-in encoding: Not available\n');
    end
    
    % Method 2: Simple encoding
    encoded2 = '';
    for i = 1:length(CONDITION_NAME)
        c = CONDITION_NAME(i);
        if (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || ...
           c == '-' || c == '_' || c == '.' || c == '~'
            encoded2 = [encoded2 c];
        else
            encoded2 = [encoded2 sprintf('%%%02X', double(c))];
        end
    end
    fprintf('   Simple encoding: %s\n', encoded2);
    
    % Method 3: UTF-8 encoding
    try
        bytes = unicode2native(CONDITION_NAME, 'UTF-8');
        encoded3 = '';
        for i = 1:length(bytes)
            if (bytes(i) >= 65 && bytes(i) <= 90) || (bytes(i) >= 97 && bytes(i) <= 122) || ...
               (bytes(i) >= 48 && bytes(i) <= 57) || bytes(i) == 45 || bytes(i) == 95 || ...
               bytes(i) == 46 || bytes(i) == 126
                encoded3 = [encoded3 char(bytes(i))];
            else
                encoded3 = [encoded3 sprintf('%%%02X', bytes(i))];
            end
        end
        fprintf('   UTF-8 encoding: %s\n', encoded3);
    catch
        fprintf('   UTF-8 encoding: Failed\n');
    end
    
catch ME
    fprintf('   Encoding test failed: %s\n', ME.message);
end

%% Test 7: Simple fetch function
fprintf('\n7. Testing simple fetch function...\n');
try
    [measurements, metadata] = fetch_measurements_simple(CONDITION_NAME, ...
        'BaseURL', BASE_URL, 'Limit', 5, 'Verbose', true);
    
    if ~isempty(measurements)
        fprintf('   ✓ Simple function successful: %d measurements\n', length(measurements));
    else
        fprintf('   ⚠ Simple function returned no data\n');
    end
    
catch ME
    fprintf('   ❌ Simple function error: %s\n', ME.message);
end

%% Summary and Recommendations
fprintf('\n=== SUMMARY AND RECOMMENDATIONS ===\n');
fprintf('1. If Test 1 failed: Check if the server is running and accessible\n');
fprintf('2. If Test 2 failed: Check if the MongoDB service is working\n');
fprintf('3. If Test 3 passed but Test 4 failed: Issue is with condition name parameter\n');
fprintf('4. If browser works but MATLAB doesn''t: Try Method A (query struct) from Test 4\n');
fprintf('5. For encoding issues: Compare the encoding methods in Test 6\n');
fprintf('\nRecommended solution: Use the query struct method (Method A) as it lets MATLAB handle encoding\n');

function value = getfield(s, field, default)
    if isfield(s, field)
        value = s.(field);
    else
        value = default;
    end
end