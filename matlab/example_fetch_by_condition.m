% EXAMPLE: Fetch and Analyze MongoDB Measurements by Condition
% This script demonstrates how to fetch measurement data by condition name
% and perform basic analysis using MATLAB

%% Configuration
% Set your API configuration
BASE_URL = 'https://5ca5-46-205-204-72.ngrok-free.app';
CONDITION_NAME = 'pomiar_prądu_9';  % Replace with your actual condition name
DEVICE_ID = 'q4Z_ooBVKFJA';         % Optional: specific device filter

%% Example 1: Basic fetch by condition name
fprintf('Example 1: Fetching measurements for condition: %s\n', CONDITION_NAME);
try
    [measurements1, metadata1] = fetch_measurements_by_condition(CONDITION_NAME, ...
        'BaseURL', BASE_URL, ...
        'Verbose', true);
    
    if ~isempty(measurements1)
        fprintf('✓ Found %d measurements\n', length(measurements1));
        
        % Display first measurement
        if length(measurements1) >= 1
            fprintf('Sample measurement fields: %s\n', strjoin(fieldnames(measurements1), ', '));
        end
    else
        fprintf('⚠ No measurements found\n');
    end
    
catch ME
    fprintf('❌ Error: %s\n', ME.message);
end

%% Example 2: Fetch with device filter and limit
fprintf('\nExample 2: Fetching with device filter and limit\n');
try
    [measurements2, metadata2] = fetch_measurements_by_condition(CONDITION_NAME, ...
        'BaseURL', BASE_URL, ...
        'DeviceId', DEVICE_ID, ...
        'Limit', 50, ...
        'Verbose', true);
    
    if ~isempty(measurements2)
        fprintf('✓ Found %d measurements for device %s\n', length(measurements2), DEVICE_ID);
    end
    
catch ME
    fprintf('❌ Error: %s\n', ME.message);
end

%% Example 3: Fetch last 24 hours of data
fprintf('\nExample 3: Fetching last 24 hours of data\n');
try
    [measurements3, metadata3] = fetch_measurements_by_condition(CONDITION_NAME, ...
        'BaseURL', BASE_URL, ...
        'TimeRange', '-24h', ...
        'Verbose', true);
    
    if ~isempty(measurements3)
        fprintf('✓ Found %d measurements in last 24 hours\n', length(measurements3));
    end
    
catch ME
    fprintf('❌ Error: %s\n', ME.message);
end

%% Example 4: JSON Data Analysis and Channel Visualization
if exist('measurements1', 'var') && ~isempty(measurements1)
    fprintf('\nExample 4: JSON Data Analysis and Channel Visualization\n');
    
    % Check available fields
    fields = fieldnames(measurements1);
    fprintf('Available data fields: %s\n', strjoin(fields, ', '));
    
    % Look for 'data' field containing JSON measurements
    data_found = false;
    
    % Use helper function to extract channel data
    channel_data = extract_channel_data(measurements1);
    
    % Check if any channel data was found
    if ~isempty(fieldnames(channel_data))
        data_found = true;
        fprintf('✓ Channel data extracted successfully\n');
        
        % Get available channels
        available_channels = fieldnames(channel_data);
        fprintf('Available channels: %s\n', strjoin(available_channels, ', '));
        
        % Display channel statistics
        for i = 1:length(available_channels)
            channel = available_channels{i};
            values = channel_data.(channel);
            fprintf('Channel %s: %d samples, mean=%.4f, std=%.4f, range=[%.4f,%.4f]\n', ...
                    upper(channel), length(values), mean(values), std(values), min(values), max(values));
        end
        
        % Create visualizations using helper function
        plot_channel_comparison(channel_data, CONDITION_NAME);
        
        % Create individual channel plots
        num_channels = length(available_channels);
        if num_channels > 0
            cols = min(3, num_channels);
            rows = ceil(num_channels / cols);
            
            figure('Name', sprintf('Individual Channels - %s', CONDITION_NAME), ...
                   'Position', [100, 100, 300*cols, 250*rows]);
            
            for i = 1:num_channels
                channel = available_channels{i};
                values = channel_data.(channel);
                
                subplot(rows, cols, i);
                plot(values, 'LineWidth', 1.5);
                title(sprintf('%s', upper(channel)));
                xlabel('Sample');
                ylabel('Value');
                grid on;
                
                % Add min/max annotations
                [max_val, max_idx] = max(values);
                [min_val, min_idx] = min(values);
                hold on;
                plot(max_idx, max_val, 'ro', 'MarkerSize', 6);
                plot(min_idx, min_val, 'bo', 'MarkerSize', 6);
                hold off;
            end
        end
        
        fprintf('✓ Created comprehensive channel visualizations\n');
        
    else
        fprintf('⚠ No parseable channel data found in measurements\n');
        
        % Fall back to looking for other numeric fields
        fprintf('Looking for alternative numeric fields...\n');
        numeric_fields = {};
        for i = 1:length(fields)
            if isnumeric(measurements1(1).(fields{i})) && ~contains(fields{i}, 'Id')
                numeric_fields{end+1} = fields{i};
            end
        end
        
        if ~isempty(numeric_fields)
            fprintf('Found numeric fields: %s\n', strjoin(numeric_fields, ', '));
            
            % Basic plot for first numeric field
            field_name = numeric_fields{1};
            values = [measurements1.(field_name)];
            
            if length(values) > 1
                figure('Name', sprintf('Measurements for %s', CONDITION_NAME));
                plot(values, 'b-o', 'MarkerSize', 4);
                title(sprintf('Measurement Values: %s (Field: %s)', CONDITION_NAME, field_name));
                xlabel('Sample Index');
                ylabel(field_name);
                grid on;
                
                fprintf('✓ Created fallback plot for %s\n', field_name);
            end
        end
    end
    
    % Check for timestamp fields
    timestamp_fields = fields(contains(fields, 'timestamp') | contains(fields, 'time') | contains(fields, 'date'));
    if ~isempty(timestamp_fields)
        fprintf('Timestamp fields found: %s\n', strjoin(timestamp_fields, ', '));
    end
end

%% Example 5: Export data to file (if measurements were found)
if exist('measurements1', 'var') && ~isempty(measurements1)
    fprintf('\nExample 5: Export Data\n');
    
    try
        % Convert to table for easier export
        data_table = struct2table(measurements1);
        
        % Create filename
        timestamp = datestr(now, 'yyyymmdd_HHMMSS');
        filename = sprintf('measurements_%s_%s.csv', CONDITION_NAME, timestamp);
        filename = strrep(filename, ' ', '_'); % Remove spaces
        
        % Write to CSV
        writetable(data_table, filename);
        fprintf('✓ Data exported to: %s\n', filename);
        
    catch ME
        fprintf('❌ Export error: %s\n', ME.message);
    end
end

%% Summary
fprintf('\n=== SUMMARY ===\n');
fprintf('Condition tested: %s\n', CONDITION_NAME);
fprintf('API endpoint: %s/api/mongodb/measurements\n', BASE_URL);

% Count total unique measurements across all examples
total_unique = 0;
if exist('measurements1', 'var'), total_unique = max(total_unique, length(measurements1)); end
if exist('measurements2', 'var'), total_unique = max(total_unique, length(measurements2)); end
if exist('measurements3', 'var'), total_unique = max(total_unique, length(measurements3)); end

fprintf('Maximum measurements found: %d\n', total_unique);
fprintf('Script completed successfully!\n');

%% Helper Functions

function channel_data = extract_channel_data(measurements)
    % Extract channel data from measurement JSON data fields
    % Returns a struct with channel names as fields and combined data as values
    
    channel_data = struct();
    channel_names = {'w', 'udc', 'uc', 'ub', 'ua', 'ib', 'ic', 'ia', 'idc'};
    
    for i = 1:length(measurements)
        measurement = measurements(i);
        
        if isfield(measurement, 'data')
            try
                % Parse JSON data
                if ischar(measurement.data) || isstring(measurement.data)
                    parsed_data = jsondecode(measurement.data);
                elseif isstruct(measurement.data)
                    parsed_data = measurement.data;
                else
                    continue;
                end
                
                % Extract each channel
                for j = 1:length(channel_names)
                    channel = channel_names{j};
                    if isfield(parsed_data, channel)
                        channel_values = parsed_data.(channel);
                        if isnumeric(channel_values)
                            if ~isfield(channel_data, channel)
                                channel_data.(channel) = [];
                            end
                            % Concatenate values from multiple measurements
                            channel_data.(channel) = [channel_data.(channel); channel_values(:)];
                        end
                    end
                end
                
            catch
                % Skip measurements with invalid JSON
                continue;
            end
        end
    end
end

function plot_channel_comparison(channel_data, condition_name)
    % Create comprehensive plots for channel data comparison
    
    available_channels = fieldnames(channel_data);
    num_channels = length(available_channels);
    
    if num_channels == 0
        fprintf('No channel data to plot\n');
        return;
    end
    
    % Define channel groups for better visualization
    voltage_channels = {'udc', 'uc', 'ub', 'ua'};
    current_channels = {'ib', 'ic', 'ia', 'idc'};
    power_channels = {'w'};
    
    % Voltage channels plot
    voltage_data = {};
    voltage_labels = {};
    for i = 1:length(voltage_channels)
        if isfield(channel_data, voltage_channels{i})
            voltage_data{end+1} = channel_data.(voltage_channels{i});
            voltage_labels{end+1} = upper(voltage_channels{i});
        end
    end
    
    if ~isempty(voltage_data)
        figure('Name', sprintf('Voltage Channels - %s', condition_name), ...
               'Position', [100, 300, 800, 400]);
        hold on;
        colors = lines(length(voltage_data));
        for i = 1:length(voltage_data)
            plot(voltage_data{i}, 'Color', colors(i,:), 'LineWidth', 2, ...
                 'DisplayName', voltage_labels{i});
        end
        title('Voltage Measurements');
        xlabel('Sample Index');
        ylabel('Voltage (V)');
        legend('Location', 'best');
        grid on;
        hold off;
    end
    
    % Current channels plot
    current_data = {};
    current_labels = {};
    for i = 1:length(current_channels)
        if isfield(channel_data, current_channels{i})
            current_data{end+1} = channel_data.(current_channels{i});
            current_labels{end+1} = upper(current_channels{i});
        end
    end
    
    if ~isempty(current_data)
        figure('Name', sprintf('Current Channels - %s', condition_name), ...
               'Position', [150, 250, 800, 400]);
        hold on;
        colors = lines(length(current_data));
        for i = 1:length(current_data)
            plot(current_data{i}, 'Color', colors(i,:), 'LineWidth', 2, ...
                 'DisplayName', current_labels{i});
        end
        title('Current Measurements');
        xlabel('Sample Index');
        ylabel('Current (A)');
        legend('Location', 'best');
        grid on;
        hold off;
    end
    
    % Power channels plot
    if isfield(channel_data, 'w')
        figure('Name', sprintf('Power Channel - %s', condition_name), ...
               'Position', [200, 200, 800, 400]);
        plot(channel_data.w, 'r-', 'LineWidth', 2);
        title('Power Measurements');
        xlabel('Sample Index');
        ylabel('Power (W)');
        grid on;
    end
end