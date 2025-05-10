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
    public $controllerNamespace = 'app\modules\api\controllers';

    /**
     * {@inheritdoc}
     */
    public function init()
    {
        parent::init();
        
        // Ustawienie domyślnego kontrolera
        $this->defaultRoute = 'device-measurement';
        
        // Konfiguracja dla API
        \Yii::$app->response->format = \yii\web\Response::FORMAT_JSON;
    }
}
