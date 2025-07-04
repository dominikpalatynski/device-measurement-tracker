<?php

namespace app\filters;

use Yii;
use yii\base\ActionFilter;
use yii\web\UnauthorizedHttpException;
use yii\web\ForbiddenHttpException;
use app\models\User;

/**
 * JWT Authentication Filter
 */
class JwtAuthFilter extends ActionFilter
{
    /**
     * @var array List of actions that don't require authentication
     */
    public $except = [];

    /**
     * @var array Required roles for specific actions
     * Format: ['action' => ['role1', 'role2']]
     */
    public $roles = [];

    /**
     * @var bool Whether to throw exception on authentication failure
     */
    public $throwException = true;

    /**
     * @var string User class for token lookup (for testing)
     */
    public $userClass = \app\models\User::class;

    /**
     * {@inheritdoc}
     */
    public function beforeAction($action)
    {
        $actionId = $action->id;

        // Skip authentication for excepted actions
        if (in_array($actionId, $this->except)) {
            return true;
        }

        // Get JWT token from Authorization header
        $token = $this->extractTokenFromHeader();

        if (!$token) {
            if ($this->throwException) {
                throw new UnauthorizedHttpException('Authentication required. Please provide a valid JWT token.');
            }
            return false;
        }

        // Find user by access token
        $user = call_user_func([$this->userClass, 'findIdentityByAccessToken'], $token);

        if (!$user) {
            if ($this->throwException) {
                throw new UnauthorizedHttpException('Invalid or expired JWT token.');
            }
            return false;
        }

        // Check role-based access
        if (isset($this->roles[$actionId])) {
            $requiredRoles = (array)$this->roles[$actionId];
            if (!in_array($user->role, $requiredRoles)) {
                if ($this->throwException) {
                    throw new ForbiddenHttpException('Insufficient permissions. Required role: ' . implode(' or ', $requiredRoles));
                }
                return false;
            }
        }

        // Set user in Yii application
        Yii::$app->user->setIdentity($user);

        return parent::beforeAction($action);
    }

    /**
     * Extract JWT token from Authorization header
     * @return string|null
     */
    protected function extractTokenFromHeader()
    {
        $authHeader = Yii::$app->request->headers->get('Authorization');
        
        if ($authHeader && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }
        
        return null;
    }
}
