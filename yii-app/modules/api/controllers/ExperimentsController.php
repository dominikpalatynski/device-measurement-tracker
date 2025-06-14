<?php

namespace app\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use yii\web\NotFoundHttpException;
use yii\web\ServerErrorHttpException;
use yii\helpers\Json;
use app\models\Experiments;
use app\models\Devices;
use app\models\Phenomena;

class ExperimentsController extends Controller
{    /**
     * {@inheritdoc}
     */
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        
        // Add HTTP method filter
        $behaviors['verbs'] = [
            'class' => \yii\filters\VerbFilter::class,
            'actions' => [
                'create' => ['POST'],
                'update' => ['PUT', 'PATCH'],
                'delete' => ['DELETE'],
                'list' => ['GET'],
                'view' => ['GET'],
                'test' => ['GET'],
            ],
        ];
        
        // Add CORS filter
        $behaviors['corsFilter'] = [
            'class' => \yii\filters\Cors::class,
            'cors' => [
                'Origin' => ['http://localhost:3000', 'http://localhost:3001', 'http://172.22.176.1:3000', 'http://172.22.176.1:3001'],
                'Access-Control-Request-Method' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
                'Access-Control-Request-Headers' => ['*'],
                'Access-Control-Allow-Credentials' => true,
                'Access-Control-Max-Age' => 3600,
            ],
        ];
        
        return $behaviors;
    }/**
     * Get all experiments
     */
    public function actionList()
    {
        Yii::info("Experiments list endpoint called", 'api.experiments');
        
        try {
            $experiments = Experiments::find()->all();
            
            return [
                'success' => true,
                'data' => array_map(function($experiment) {
                    return $experiment->attributes;
                }, $experiments),
            ];
        } catch (\Exception $e) {
            Yii::error("Error fetching experiments: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }    /**
     * Get a single experiment by ID
     */
    public function actionView()
    {
        Yii::info("Experiment view endpoint called", 'api.experiments');
        
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $experiment = $this->findExperiment($id);
            
            return [
                'success' => true,
                'data' => $experiment->attributes,
            ];
        } catch (\Exception $e) {
            Yii::error("Error fetching experiment: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }    /**
     * Create a new experiment
     */
    public function actionCreate()
    {
        Yii::info("Experiment create endpoint called", 'api.experiments');
        
        try {
            $rawBody = Yii::$app->request->rawBody;
            if (empty($rawBody)) {
                throw new ServerErrorHttpException('Request body is empty');
            }
            
            $data = Json::decode($rawBody);
            
            // Validate required fields
            if (empty($data['name']) || empty($data['device_id'])) {
                throw new ServerErrorHttpException('Missing required fields: name and device_id are required');
            }            // Check if device exists
            $device = Devices::findByDeviceId($data['device_id']);
            if (!$device) {
                throw new ServerErrorHttpException('Device not found with ID: ' . $data['device_id']);
            }
            
            $experiment = Experiments::createExperiment(
                $data['device_id'],
                $data['name'],
                $data['description'] ?? null
            );
            
            if (!$experiment) {
                throw new ServerErrorHttpException('Error creating experiment');
            }
            
            // Create default phenomenon if provided
            if (!empty($data['phenomena']) && is_array($data['phenomena'])) {
                foreach ($data['phenomena'] as $phenomenonData) {
                    if (!empty($phenomenonData['name'])) {
                        Phenomena::createPhenomenon(
                            $experiment->experiment_id,
                            $phenomenonData['name'],
                            $phenomenonData['description'] ?? null
                        );
                    }
                }
            }
            
            return [
                'success' => true,
                'data' => $experiment->attributes,
                'message' => 'Experiment created successfully',
            ];
        } catch (\Exception $e) {
            Yii::error("Error creating experiment: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Update an experiment
     */
    public function actionUpdate()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $experiment = $this->findExperiment($id);
            
            $rawBody = Yii::$app->request->rawBody;
            if (empty($rawBody)) {
                throw new ServerErrorHttpException('Request body is empty');
            }
            
            $data = Json::decode($rawBody);
            $experiment->attributes = $data;
            
            if (!$experiment->save()) {
                throw new ServerErrorHttpException('Error updating experiment: ' . 
                    Json::encode($experiment->errors));
            }
            
            return [
                'success' => true,
                'data' => $experiment->attributes,
                'message' => 'Experiment updated successfully',
            ];
        } catch (\Exception $e) {
            Yii::error("Error updating experiment: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Delete an experiment
     */
    public function actionDelete()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $experiment = $this->findExperiment($id);
            
            if (!$experiment->delete()) {
                throw new ServerErrorHttpException('Error deleting experiment');
            }
            
            return [
                'success' => true,
                'message' => 'Experiment deleted successfully',
            ];
        } catch (\Exception $e) {
            Yii::error("Error deleting experiment: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }    /**
     * Test endpoint
     */
    public function actionTest()
    {
        Yii::info("Experiments test endpoint called", 'api.experiments');
        
        return [
            'success' => true,
            'message' => 'ExperimentsController is working',
            'timestamp' => date('Y-m-d H:i:s'),
            'controller' => static::class,
        ];
    }    /**
     * Find experiment by ID
     */
    protected function findExperiment($id)
    {
        $experiment = Experiments::findOne(['experiment_id' => $id]);
        if ($experiment === null) {
            throw new NotFoundHttpException('Experiment not found');
        }
        return $experiment;
    }
}
