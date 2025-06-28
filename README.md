# Device Measurement Tracker - Project Summary

**Study Project: IoT Data Monitoring and Visualization Platform**

## 📝 Executive Summary

This project presents a comprehensive IoT monitoring and data visualization platform designed for academic research and industrial applications. The system enables real-time tracking, analysis, and visualization of measurement data from various IoT devices including drones, DSP (Digital Signal Processing) units, and linear motion modules.

The platform addresses the growing need for efficient data collection and analysis in IoT environments, providing both real-time streaming capabilities and batch processing for historical data analysis. The solution demonstrates modern web technologies, database design, and IoT communication protocols working together to create a scalable monitoring system.

## 🎯 Project Objectives

The primary objectives of this study project were to:

-   **Develop a scalable IoT data collection system** that can handle multiple device types and data formats
-   **Implement real-time data visualization** to provide immediate insights into device performance
-   **Create a flexible experiment management system** for organizing and analyzing measurement campaigns
-   **Design a modern web interface** that enables researchers and operators to interact with live data
-   **Demonstrate practical application** of full-stack development in IoT environments

## 🏗️ System Architecture & Design

The application follows a modern microservices architecture with four distinct components, each serving a specific purpose in the data flow pipeline:

### **Frontend Layer - User Interface (Next.js + React)**

The web application serves as the primary interface for researchers and operators. Built with Next.js and React, it provides:

-   **Real-time dashboards** displaying live measurement data with automatic updates
-   **Interactive data visualization** using advanced charting libraries (Recharts)
-   **Experiment management interface** for creating and organizing measurement campaigns
-   **Device monitoring panels** showing device status and configuration
-   **Responsive design** that works across desktop and mobile devices

### **Backend API Layer - Data Management (Yii2 Framework)**

The server-side application handles all business logic and data persistence:

-   **RESTful API endpoints** for device registration, experiment management, and data retrieval
-   **Database abstraction layer** managing complex relationships between devices, experiments, and measurements
-   **MQTT message processing** converting incoming IoT data into structured database records
-   **Authentication and authorization** ensuring secure access to device data
-   **Data validation and sanitization** maintaining data integrity

### **Message Broker - Real-time Communication (Eclipse Mosquitto)**

The MQTT broker enables real-time communication between IoT devices and the application:

-   **Publish/Subscribe messaging** allowing devices to send data and receive commands
-   **Topic-based routing** organizing messages by device ID and measurement type
-   **Message persistence** ensuring data is not lost during network interruptions
-   **WebSocket gateway** enabling browser-based real-time updates

### **Data Processing Layer - Analytics (Python Scripts)**

Python utilities provide flexible data processing capabilities:

-   **Device registration automation** streamlining the onboarding of new devices
-   **Batch data processing** handling large datasets from measurement campaigns
-   **Real-time data simulation** for testing and demonstration purposes
-   **Configuration management** maintaining device-specific settings

## � How the Application Works

### **Data Collection Workflow**

The application operates through a well-defined data flow that handles both real-time and historical data:

#### **1. Device Registration and Authentication**

-   Each IoT device is assigned a unique identifier and access token
-   Devices register with the system through a secure API endpoint
-   Configuration parameters are stored including device type, capabilities, and measurement channels
-   Authentication tokens ensure only authorized devices can submit data

#### **2. Experiment Organization**

The system uses a hierarchical structure to organize measurement data:

-   **Devices** represent physical IoT units (drones, sensors, etc.)
-   **Experiments** group related measurements for specific research objectives
-   **Phenomena** represent individual measurement sessions within an experiment
-   This structure allows researchers to organize complex measurement campaigns effectively

#### **3. Real-time Data Streaming**

-   IoT devices publish measurement data to MQTT topics using device-specific channels
-   The backend subscribes to these topics and processes incoming messages
-   Data is validated, parsed, and stored in the database with timestamp information
-   WebSocket connections push updates to connected browser clients
-   The frontend automatically updates charts and displays without user intervention

#### **4. Batch Data Processing**

-   Historical data files (CSV, JSON, binary formats) can be imported into the system
-   Python scripts process and map data according to configurable schemas
-   Batch processing supports large datasets from measurement campaigns
-   Data is normalized and integrated with the existing experiment structure

#### **5. Data Visualization and Analysis**

-   The web interface provides multiple visualization modes:
    -   **Live Data View**: Real-time streaming data with automatic updates
    -   **Interactive Charts**: Historical data analysis with zoom, filter, and comparison capabilities
    -   **Statistical Analysis**: Automatic calculation of min, max, average, and trend analysis
    -   **Multi-parameter Display**: Simultaneous visualization of multiple measurement channels

### **User Interaction Flow**

#### **Researcher/Operator Workflow:**

1. **Access the web interface** through a modern browser
2. **Select a device** from the registered device list
3. **Choose an experiment** or create a new measurement campaign
4. **Navigate to phenomena** to view specific measurement sessions
5. **Switch between visualization modes**:
    - Live data for real-time monitoring
    - Charts for historical analysis and comparison
6. **Configure display options** including chart types, time ranges, and data filters
7. **Export or analyze data** using built-in statistical tools

#### **Device Integration Process:**

1. **Device Registration**: IoT devices register with unique identifiers
2. **Configuration Setup**: Measurement channels and parameters are configured
3. **Data Transmission**: Devices begin sending measurement data via MQTT
4. **Automatic Processing**: The system processes and stores data in real-time
5. **Immediate Visualization**: Data becomes available in the web interface instantly

### **Technical Innovation Features**

#### **Smart Data Visualization**

-   **Auto-zoom functionality** automatically adjusts chart scales for concentrated data
-   **Adaptive chart types** (line, area, bar, scatter) optimize display for different data patterns
-   **Data sampling algorithms** handle large datasets efficiently without performance loss
-   **Real-time chart updates** provide immediate feedback without page refreshes

#### **Flexible Data Processing**

-   **JSON payload support** allows complex, nested measurement data structures
-   **Multi-channel processing** handles simultaneous measurements from multiple sensors
-   **Configurable data mapping** adapts to different device types and measurement formats
-   **Timestamp synchronization** ensures accurate temporal correlation of measurements

#### **Scalable Architecture**

-   **Microservices design** allows independent scaling of different system components
-   **Database optimization** uses efficient schemas for high-frequency data insertion
-   **Message queuing** handles burst data transmission without data loss
-   **Caching strategies** optimize performance for frequently accessed data

## 🎯 Key Features and Capabilities

### **Device Management System**

The platform provides comprehensive device lifecycle management:

-   **Multi-device support** for various IoT device types (drones, DSP units, linear modules)
-   **Automatic device discovery** and registration through secure token-based authentication
-   **Device status monitoring** with real-time health checks and connectivity status
-   **Configuration management** allowing remote parameter adjustment and calibration
-   **Device verification** ensuring data integrity and preventing unauthorized access

### **Advanced Experiment Management**

The hierarchical experiment structure enables complex research scenarios:

-   **Experiment planning** with predefined measurement protocols and duration settings
-   **Phenomenon tracking** for individual measurement sessions within larger experiments
-   **Temporal organization** with precise timestamp tracking and duration measurement
-   **Data categorization** allowing researchers to group related measurements effectively
-   **Experiment metadata** storage including objectives, parameters, and research notes

### **Real-time Data Processing**

The system excels in live data handling and immediate visualization:

-   **Sub-second data updates** with MQTT-based messaging for minimal latency
-   **Automatic chart updates** providing real-time visual feedback without user intervention
-   **Live statistical calculation** showing running averages, trends, and anomaly detection
-   **Configurable refresh intervals** allowing users to balance performance with data freshness
-   **Multi-parameter streaming** handling complex sensor arrays with multiple simultaneous measurements

### **Intelligent Data Visualization**

Advanced visualization capabilities provide deep insights into measurement data:

-   **Adaptive chart rendering** with automatic scale adjustment for optimal data display
-   **Interactive time-series analysis** with zoom, pan, and selection capabilities
-   **Multi-chart comparison** allowing side-by-side analysis of different parameters
-   **Statistical overlay** showing min, max, average, and trend lines automatically
-   **Export functionality** for further analysis in external tools

### **Flexible Data Import and Processing**

The platform accommodates various data sources and formats:

-   **Batch file processing** for historical data integration from measurement campaigns
-   **Multiple format support** including CSV, JSON, and binary data files
-   **Configurable data mapping** allowing adaptation to different device output formats
-   **Data validation and cleaning** ensuring quality and consistency of imported measurements
-   **Bulk import capabilities** for processing large historical datasets efficiently

## �️ Database Design and Data Management

The system employs a carefully designed relational database schema that supports complex IoT data relationships:

### **Core Data Entities**

#### **Devices Table**

Stores fundamental device information and registration data:

-   Device identification (unique IDs, names, types)
-   Registration timestamps and authentication tokens
-   Status tracking (Active, Pending, Inactive)
-   Configuration parameters and capabilities

#### **Experiments Table**

Manages research experiments and measurement campaigns:

-   Experiment metadata (names, descriptions, objectives)
-   Temporal information (start times, durations, status)
-   Experiment types and categorization
-   Researcher notes and parameters

#### **Phenomena Table**

Tracks individual measurement sessions within experiments:

-   Phenomenon identification and descriptions
-   Temporal boundaries and duration tracking
-   Status monitoring (Active, Completed, Failed)
-   Links to parent experiments and associated devices

#### **Measurement Data Table**

The core table storing all measurement information:

-   Temporal data (precise timestamps, upload times)
-   Device and phenomenon associations
-   JSON payload storage for flexible data structures
-   Upload type classification (real-time vs. batch)
-   Data validation and integrity flags

#### **Measurement Channels Table**

Defines measurement parameters and sensor configurations:

-   Channel identification and naming
-   Data type definitions and validation rules
-   Unit specifications and calibration parameters
-   Device-specific channel mappings

### **Data Flow and Storage Strategy**

The database design accommodates both structured and semi-structured data:

-   **Structured metadata** (device info, timestamps, identifiers) stored in traditional relational columns
-   **Flexible measurement data** stored as JSON payloads allowing device-specific data formats
-   **Indexing strategy** optimized for time-series queries and device-based filtering
-   **Data partitioning** supporting efficient storage and retrieval of large measurement datasets

## 🔗 System Integration and Communication

### **API Architecture and Data Exchange**

The system provides a comprehensive RESTful API that facilitates seamless communication between system components:

#### **Device Management APIs**

-   **Device Registration Endpoint** (`POST /api/devices`) handles new device onboarding with validation
-   **Device Status API** (`GET /api/devices/{id}`) provides real-time device health and configuration data
-   **Device Configuration API** (`PUT /api/devices/{id}/config`) enables remote parameter updates

#### **Experiment Management APIs**

-   **Experiment Creation** (`POST /api/experiments`) establishes new measurement campaigns
-   **Phenomenon Management** (`GET/POST /api/experiments/{id}/phenomena`) handles measurement session lifecycle
-   **Data Retrieval** (`GET /api/phenomena/{id}/measurements`) provides filtered access to measurement data

#### **Real-time Data APIs**

-   **Live Data Stream** (`GET /api/measurements/live`) provides WebSocket-based real-time data access
-   **Measurement Submission** (`POST /api/measurements`) handles incoming IoT device data
-   **Data Filtering** (`GET /api/measurements/filter`) enables time-range and parameter-based data queries

### **MQTT Communication Protocol**

The MQTT broker serves as the central communication hub for IoT devices:

#### **Topic Structure and Message Routing**

-   **Device-specific topics** (`devices/{device_id}/measurements`) ensure organized message routing
-   **Command topics** (`devices/{device_id}/commands`) enable bidirectional device communication
-   **Status topics** (`devices/{device_id}/status`) provide device health monitoring
-   **Quality of Service (QoS) levels** ensure reliable message delivery based on data criticality

#### **Message Format and Data Validation**

-   **JSON message payloads** provide structured data transmission with schema validation
-   **Timestamp synchronization** ensures accurate temporal correlation across devices
-   **Data integrity checks** prevent corrupted or invalid measurements from entering the system
-   **Authentication and authorization** secure device communication through token-based validation

## � Practical Applications and Use Cases

### **Research and Academic Applications**

#### **Laboratory Measurement Campaigns**

The platform serves as a comprehensive data collection and analysis tool for research environments:

-   **Multi-device sensor networks** collecting synchronized measurements across different experimental setups
-   **Long-duration experiments** with continuous data logging and real-time monitoring capabilities
-   **Comparative analysis** enabling researchers to compare measurements from different devices or experimental conditions
-   **Data validation and quality assurance** through real-time anomaly detection and statistical analysis

#### **Educational Demonstrations**

The system provides an excellent platform for teaching IoT concepts and data science:

-   **Real-time data visualization** demonstrating immediate feedback from sensor networks
-   **Experiment design and execution** teaching students proper measurement campaign organization
-   **Data analysis techniques** showing statistical processing and trend identification
-   **System architecture learning** illustrating modern web technologies and IoT communication protocols

### **Industrial and Commercial Applications**

#### **Equipment Monitoring and Predictive Maintenance**

The platform adapts well to industrial monitoring scenarios:

-   **Continuous equipment health monitoring** with automatic alert generation for abnormal conditions
-   **Trend analysis and predictive maintenance** identifying potential equipment failures before they occur
-   **Multi-parameter monitoring** tracking various operational metrics simultaneously
-   **Historical data analysis** enabling optimization of operational parameters and maintenance schedules

#### **Quality Control and Process Optimization**

Manufacturing and production environments benefit from real-time monitoring:

-   **Process parameter tracking** ensuring optimal operating conditions
-   **Quality metrics monitoring** with immediate notification of deviations from specifications
-   **Production efficiency analysis** identifying bottlenecks and optimization opportunities
-   **Compliance monitoring** maintaining records for regulatory requirements

### **Technical Demonstration Scenarios**

#### **IoT System Prototyping**

The platform serves as a complete IoT development and testing environment:

-   **Device integration testing** validating new IoT devices before deployment
-   **Communication protocol evaluation** testing different data transmission methods
-   **Scalability testing** evaluating system performance under various load conditions
-   **User interface development** providing a foundation for custom monitoring applications

## 🔍 Performance Characteristics and Scalability

### **System Performance Metrics**

#### **Real-time Data Processing**

-   **Sub-second latency** from device data transmission to web interface display
-   **High-frequency data handling** supporting measurement rates up to 100 Hz per device
-   **Concurrent device support** handling multiple devices simultaneously without performance degradation
-   **Automatic load balancing** distributing processing load across system components

#### **Data Storage and Retrieval**

-   **Efficient time-series storage** optimized for high-frequency measurement data insertion
-   **Fast query performance** enabling rapid historical data retrieval and analysis
-   **Data compression** reducing storage requirements while maintaining data fidelity
-   **Backup and recovery** ensuring data persistence and system reliability

### **Scalability and Future Extensions**

#### **Horizontal Scaling Capabilities**

-   **Microservices architecture** enabling independent scaling of system components
-   **Database partitioning** supporting growth in device count and data volume
-   **Load balancer integration** distributing user requests across multiple server instances
-   **Cloud deployment compatibility** supporting deployment on various cloud platforms

#### **Extension and Customization Opportunities**

-   **Plugin architecture** allowing integration of custom data processing algorithms
-   **API extensibility** enabling integration with external systems and tools
-   **Custom visualization components** supporting domain-specific data display requirements
-   **Machine learning integration** providing foundation for predictive analytics and anomaly detection

## 🎓 Learning Outcomes and Technical Achievements

### **Full-Stack Development Skills**

#### **Frontend Development Mastery**

-   **Modern React Development** with Next.js framework and server-side rendering
-   **Real-time User Interfaces** implementing WebSocket connections and automatic updates
-   **Advanced Data Visualization** using Recharts library for interactive charts and graphs
-   **Responsive Design** creating mobile-friendly interfaces with Tailwind CSS
-   **TypeScript Integration** ensuring type safety and improved code maintainability

#### **Backend Development Expertise**

-   **RESTful API Design** implementing comprehensive endpoints for data management
-   **Database Design and Optimization** creating efficient schemas for time-series data
-   **Message Queue Integration** handling MQTT communication and real-time data processing
-   **Security Implementation** including authentication, authorization, and data validation
-   **Performance Optimization** implementing caching, indexing, and query optimization

### **IoT and Communication Protocols**

#### **MQTT Protocol Implementation**

-   **Publisher/Subscriber Architecture** enabling scalable device communication
-   **Topic-based Message Routing** organizing data flow through hierarchical topic structures
-   **Quality of Service (QoS) Management** ensuring reliable message delivery
-   **Real-time Communication** bridging IoT devices with web-based interfaces

#### **Data Processing and Analysis**

-   **Time-series Data Management** handling high-frequency measurement data efficiently
-   **Real-time Analytics** implementing statistical calculations and trend analysis
-   **Data Validation and Quality Control** ensuring measurement data integrity
-   **Multi-format Data Integration** supporting various device output formats and protocols

### **System Architecture and Design Patterns**

#### **Microservices Architecture**

-   **Component Separation** designing independent, scalable system modules
-   **Service Communication** implementing efficient inter-service data exchange
-   **Fault Tolerance** designing systems that gracefully handle component failures
-   **Scalability Planning** creating architecture that supports future growth

#### **Database Design and Management**

-   **Relational Database Modeling** designing efficient table structures and relationships
-   **Data Migration Management** implementing version-controlled database schema changes
-   **Performance Optimization** utilizing indexing, partitioning, and query optimization
-   **Data Integrity** ensuring consistency and reliability of stored information

## 🏆 Project Impact and Significance

### **Academic Contribution**

#### **Research Tool Development**

This project provides a comprehensive platform for IoT research and development:

-   **Standardized Data Collection** enabling consistent measurement across different research projects
-   **Reproducible Experiments** through systematic experiment organization and documentation
-   **Open Architecture** allowing researchers to extend and customize the platform for specific needs
-   **Educational Value** demonstrating modern software development practices and IoT technologies

#### **Technical Innovation**

The project showcases several innovative approaches to IoT data management:

-   **Adaptive Visualization** automatically adjusting chart displays for optimal data representation
-   **Flexible Data Schema** accommodating various device types and measurement formats
-   **Real-time Processing Pipeline** enabling immediate data analysis and visualization
-   **Scalable Architecture** supporting growth from prototype to production deployments

### **Practical Applications and Future Potential**

#### **Industry Relevance**

The skills and technologies demonstrated have direct application in industrial settings:

-   **Manufacturing Monitoring** applying real-time data collection to production environments
-   **Equipment Health Management** using predictive analytics for maintenance optimization
-   **Quality Control Systems** implementing automated monitoring and alert systems
-   **Research and Development** providing tools for product testing and validation

#### **Technology Transfer Opportunities**

The platform serves as a foundation for various commercial applications:

-   **Custom IoT Solutions** adapting the architecture for specific industry requirements
-   **Data Analytics Services** leveraging the visualization and analysis capabilities
-   **Educational Products** using the platform as a teaching tool for IoT and data science
-   **Research Collaboration** enabling data sharing and collaborative research projects

## 📈 Conclusion and Future Development

### **Project Success Metrics**

The Device Measurement Tracker project successfully demonstrates:

-   **Technical Proficiency** in modern web development technologies and IoT protocols
-   **System Integration Skills** connecting diverse technologies into a cohesive platform
-   **User Experience Design** creating intuitive interfaces for complex data analysis
-   **Scalable Architecture** designing systems that can grow with increasing demands
-   **Real-world Application** solving practical problems in data collection and analysis

### **Future Enhancement Opportunities**

#### **Advanced Analytics Features**

-   **Machine Learning Integration** for predictive analytics and anomaly detection
-   **Advanced Statistical Analysis** including correlation analysis and regression modeling
-   **Data Export and Integration** connecting with external analysis tools and platforms
-   **Custom Dashboard Creation** allowing users to design personalized monitoring interfaces

#### **Extended Device Support**

-   **Protocol Expansion** supporting additional IoT communication protocols (CoAP, LoRaWAN)
-   **Device Simulation** providing virtual devices for testing and development
-   **Mobile Device Integration** extending support to smartphone and tablet sensors
-   **Edge Computing** implementing local data processing capabilities

#### **Enterprise Features**

-   **Multi-tenant Architecture** supporting multiple organizations and user groups
-   **Advanced Security** implementing enterprise-grade authentication and encryption
-   **Audit Logging** tracking all system interactions for compliance and troubleshooting
-   **Performance Monitoring** implementing comprehensive system health monitoring

This project represents a significant achievement in full-stack development, demonstrating the ability to create complex, real-world applications that bridge the gap between IoT hardware and user-friendly data analysis tools. The platform provides immediate value for research and education while establishing a foundation for future commercial applications and continued development.


php test_influx_hierarchical_fetch.php dataseries "8"


command to run redis
 while true; do php yii redis/consume; sleep 0.5; done