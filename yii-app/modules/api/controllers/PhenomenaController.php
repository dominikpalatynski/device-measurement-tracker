<?php

namespace app\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use yii\web\NotFoundHttpException;
use yii\web\ServerErrorHttpException;
use yii\helpers\Json;
use app\models\Phenomena;

class PhenomenaController extends Controller
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
                'start' => ['POST'],
                'stop' => ['POST'],
                'finish' => ['POST'],
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
     * Get all phenomena
     */
    public function actionList()
    {
        Yii::info("Phenomena list endpoint called", 'api.phenomena');
        
        try {
            $phenomena = Phenomena::find()->all();
            
            return [
                'success' => true,
                'data' => array_map(function($phenomenon) {
                    return $phenomenon->attributes;
                }, $phenomena),
            ];
        } catch (\Exception $e) {
            Yii::error("Error fetching phenomena: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Test endpoint
     */
    public function actionTest()
    {
        Yii::info("Phenomena test endpoint called", 'api.phenomena');
        
        return [
            'success' => true,
            'message' => 'PhenomenaController is working',
            'timestamp' => date('Y-m-d H:i:s'),
            'controller' => static::class,
        ];
    }

    /**
     * Get a single phenomenon by ID
     */
    public function actionView()
    {
        Yii::info("Phenomenon view endpoint called", 'api.phenomena');
        
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $phenomenon = $this->findPhenomenon($id);
            
            return [
                'success' => true,
                'data' => $phenomenon->attributes,
            ];
        } catch (\Exception $e) {
            Yii::error("Error fetching phenomenon: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Create a new phenomenon
     */
    public function actionCreate()
    {
        Yii::info("Phenomenon create endpoint called", 'api.phenomena');
        
        try {
            $rawBody = Yii::$app->request->rawBody;
            if (empty($rawBody)) {
                throw new ServerErrorHttpException('Request body is empty');
            }
            
            $data = Json::decode($rawBody);
            
            // Validate required fields
            if (empty($data['name']) || empty($data['experiment_id'])) {
                throw new ServerErrorHttpException('Missing required fields: name and experiment_id are required');
            }
            
            $phenomenon = Phenomena::createPhenomenon(
                $data['experiment_id'],
                $data['name'],
                $data['description'] ?? null
            );
            
            if (!$phenomenon) {
                throw new ServerErrorHttpException('Error creating phenomenon');
            }
            
            return [
                'success' => true,
                'data' => $phenomenon->attributes,
                'message' => 'Phenomenon created successfully',
            ];
        } catch (\Exception $e) {
            Yii::error("Error creating phenomenon: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Update a phenomenon
     */
    public function actionUpdate()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $phenomenon = $this->findPhenomenon($id);
            
            $rawBody = Yii::$app->request->rawBody;
            if (empty($rawBody)) {
                throw new ServerErrorHttpException('Request body is empty');
            }
            
            $data = Json::decode($rawBody);
            $phenomenon->attributes = $data;
            
            if (!$phenomenon->save()) {
                throw new ServerErrorHttpException('Error updating phenomenon: ' . 
                    Json::encode($phenomenon->errors));
            }
            
            return [
                'success' => true,
                'data' => $phenomenon->attributes,
                'message' => 'Phenomenon updated successfully',
            ];
        } catch (\Exception $e) {
            Yii::error("Error updating phenomenon: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Delete a phenomenon
     */
    public function actionDelete()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $phenomenon = $this->findPhenomenon($id);
            
            if (!$phenomenon->delete()) {
                throw new ServerErrorHttpException('Error deleting phenomenon');
            }
            
            return [
                'success' => true,
                'message' => 'Phenomenon deleted successfully',
            ];
        } catch (\Exception $e) {
            Yii::error("Error deleting phenomenon: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
    
    /**
     * Start a phenomenon
     */
    public function actionStart()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $phenomenon = $this->findPhenomenon($id);
            
            if (!$phenomenon->startPhenomenon()) {
                throw new ServerErrorHttpException('Error starting phenomenon');
            }
            
            return [
                'success' => true,
                'data' => $phenomenon->attributes,
                'message' => 'Phenomenon started successfully',
            ];
        } catch (\Exception $e) {
            Yii::error("Error starting phenomenon: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
    
    /**
     * Finish a phenomenon
     */
    public function actionFinish()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $phenomenon = $this->findPhenomenon($id);
            
            if (!$phenomenon->finishPhenomenon()) {
                throw new ServerErrorHttpException('Error finishing phenomenon');
            }
            
            return [
                'success' => true,
                'data' => $phenomenon->attributes,
                'message' => 'Phenomenon finished successfully',
            ];
        } catch (\Exception $e) {
            Yii::error("Error finishing phenomenon: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
    
    /**
     * Stop a phenomenon
     */
    public function actionStop()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $phenomenon = $this->findPhenomenon($id);
            
            if (!$phenomenon->stopPhenomenon()) {
                throw new ServerErrorHttpException('Error stopping phenomenon');
            }
            
            return [
                'success' => true,
                'data' => $phenomenon->attributes,
                'message' => 'Phenomenon stopped successfully',
            ];
        } catch (\Exception $e) {
            Yii::error("Error stopping phenomenon: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }    /**
     * Find phenomenon by ID
     */
    protected function findPhenomenon($id)
    {
        $phenomenon = Phenomena::findOne(['phenomenon_id' => $id]);
        if ($phenomenon === null) {
            throw new NotFoundHttpException('Phenomenon not found');
        }
        return $phenomenon;
    }
}
