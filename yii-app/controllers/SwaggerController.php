<?php

namespace app\controllers;

use Yii;
use yii\web\Controller;
use light\swagger\SwaggerUIAsset;

/**
 * SwaggerController handles Swagger documentation actions
 */
class SwaggerController extends Controller
{
    /**
     * {@inheritdoc}
     */
    public function actions()
    {
        return [
            //The document preview address: http://api.yourhost.com/swagger/doc
            'doc' => [
                'class' => 'light\swagger\SwaggerAction',
                'restUrl' => \yii\helpers\Url::to(['/swagger/api'], true),
            ],
            //The resultUrl action.
            'api' => [
                'class' => 'light\swagger\SwaggerApiAction',
                //The scan directories, you should use real path there.
                'scanDir' => [
                    Yii::getAlias('@app/modules/api/OpenApiSpec.php'), // OpenAPI spec file first
                    Yii::getAlias('@app/modules/api/controllers'),
                    Yii::getAlias('@app/controllers'),
                    Yii::getAlias('@app/models'),
                ],
                //The security key
                'api_key' => 'balbalbal',
            ],
        ];
    }

    /**
     * Default action redirects to documentation
     * @return \yii\web\Response
     */
    public function actionIndex()
    {
        // Force asset registration to ensure assets are published
        SwaggerUIAsset::register($this->view);
        return $this->redirect(['doc']);
    }

    /**
     * Force asset republishing
     * @return \yii\web\Response
     */
    public function actionRefreshAssets()
    {
        // Clear asset manager published assets
        $assetManager = Yii::$app->assetManager;
        if (method_exists($assetManager, 'clear')) {
            $assetManager->clear();
        }
        
        // Force republish
        SwaggerUIAsset::register($this->view);
        
        return $this->redirect(['doc']);
    }
}
