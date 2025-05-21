<?php

namespace app\modules\api;

/**
 * api module definition class
 */
class Module extends \yii\base\Module
{
    /**
     * {@inheritdoc}
     */
    public $controllerNamespace = 'app\modules\api\controllers';    /**
     * {@inheritdoc}
     */
    public function init()
    {
        parent::init();

        // Ustawienie domyślnego kontrolera
        $this->defaultRoute = 'device-measurement';
        
        // Konfiguracja dla API
        \Yii::$app->response->format = \yii\web\Response::FORMAT_JSON;
        
        // Handle OPTIONS requests for CORS preflight
        \Yii::$app->response->on(\yii\web\Response::EVENT_BEFORE_SEND, function ($event) {
            $response = $event->sender;
            if (\Yii::$app->request->isOptions) {
                $response->statusCode = 200;
                $response->data = 'OK';
                $response->send();
                \Yii::$app->end();
            }
        });
    }
}
