<?php
namespace app\services;

use app\models\Condition;

class ActiveRecordConditionRepository implements ConditionRepositoryInterface
{
    public function findByName($name)
    {
        return Condition::find()->where(['name' => $name])->one();
    }
} 