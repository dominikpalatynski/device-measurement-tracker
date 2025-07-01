<?php

namespace app\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use yii\web\BadRequestHttpException;
use yii\web\UnauthorizedHttpException;
use yii\web\ServerErrorHttpException;
use yii\helpers\Json;
use app\models\User;
use app\models\LoginForm;
use app\filters\JwtAuthFilter;

/**
 * Authentication API Controller
 */
class AuthController extends Controller
{
    /**
     * {@inheritdoc}
     */
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        
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

        // Add JWT authentication filter
        $behaviors['jwtAuth'] = [
            'class' => JwtAuthFilter::class,
            'except' => ['login', 'test'], // Public endpoints
        ];

        return $behaviors;
    }

    /**
     * Test endpoint
     * GET /api/auth/test
     */
    public function actionTest()
    {
        return [
            'success' => true,
            'message' => 'Auth controller is working',
            'timestamp' => date('Y-m-d H:i:s'),
        ];
    }

    /**
     * Login endpoint
     * POST /api/auth/login
     */
    public function actionLogin()
    {
        $data = Json::decode(Yii::$app->request->rawBody);

        if (!isset($data['username']) || !isset($data['password'])) {
            throw new BadRequestHttpException('Username and password are required.');
        }

        $loginForm = new LoginForm();
        $loginForm->username = $data['username'];
        $loginForm->password = $data['password'];

        $result = $loginForm->loginApi();

        if (!$result) {
            return [
                'success' => false,
                'message' => 'Invalid credentials.',
                'errors' => $loginForm->errors,
            ];
        }

        return [
            'success' => true,
            'message' => 'Login successful.',
            'data' => $result,
        ];
    }

    /**
     * Logout endpoint
     * POST /api/auth/logout
     */
    public function actionLogout()
    {
        $user = Yii::$app->user->identity;
        
        if ($user) {
            $user->revokeAccessToken();
        }

        return [
            'success' => true,
            'message' => 'Logout successful.',
        ];
    }

    /**
     * Get current user info
     * GET /api/auth/me
     */
    public function actionMe()
    {
        $user = Yii::$app->user->identity;

        return [
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'role' => $user->role,
                    'display_name' => $user->getDisplayName(),
                    'last_login_at' => $user->last_login_at,
                ],
            ],
        ];
    }

    /**
     * Change password
     * POST /api/auth/change-password
     */
    public function actionChangePassword()
    {
        $data = Json::decode(Yii::$app->request->rawBody);
        $user = Yii::$app->user->identity;

        if (!isset($data['current_password']) || !isset($data['new_password'])) {
            throw new BadRequestHttpException('Current password and new password are required.');
        }

        if (!$user->validatePassword($data['current_password'])) {
            return [
                'success' => false,
                'message' => 'Current password is incorrect.',
            ];
        }

        if (strlen($data['new_password']) < 6) {
            return [
                'success' => false,
                'message' => 'New password must be at least 6 characters long.',
            ];
        }

        $user->setPassword($data['new_password']);
        $user->generateAuthKey();
        $user->revokeAccessToken(); // Force re-login

        if (!$user->save()) {
            throw new ServerErrorHttpException('Failed to update password.');
        }

        return [
            'success' => true,
            'message' => 'Password changed successfully. Please log in again.',
        ];
    }

    /**
     * Refresh token (generate new JWT)
     * POST /api/auth/refresh
     */
    public function actionRefresh()
    {
        $user = Yii::$app->user->identity;
        
        // Generate new token
        $token = $user->generateAccessToken();
        $user->save(false, ['access_token']);

        return [
            'success' => true,
            'message' => 'Token refreshed successfully.',
            'data' => [
                'access_token' => $token,
                'token_type' => 'Bearer',
                'expires_in' => Yii::$app->params['jwtExpiration'] ?? 3600,
            ],
        ];
    }
}