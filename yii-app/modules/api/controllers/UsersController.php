<?php

namespace app\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use yii\web\NotFoundHttpException;
use yii\web\BadRequestHttpException;
use yii\web\ServerErrorHttpException;
use yii\helpers\Json;
use yii\data\ActiveDataProvider;
use app\models\User;
use app\models\UserForm;
use app\filters\JwtAuthFilter;

/**
 * Users API Controller (Admin only)
 */
class UsersController extends Controller
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

        // Add JWT authentication filter (admin only)
        $behaviors['jwtAuth'] = [
            'class' => JwtAuthFilter::class,
            'roles' => [
                'index' => [User::ROLE_ADMIN],
                'view' => [User::ROLE_ADMIN],
                'create' => [User::ROLE_ADMIN],
                'update' => [User::ROLE_ADMIN],
                'delete' => [User::ROLE_ADMIN],
                'activate' => [User::ROLE_ADMIN],
                'deactivate' => [User::ROLE_ADMIN],
                'options' => [User::ROLE_ADMIN],
            ],
        ];

        return $behaviors;
    }

    /**
     * List all users
     * GET /api/users
     */
    public function actionIndex()
    {
        $query = User::find()->where(['!=', 'status', User::STATUS_DELETED]);
        
        // Apply filters
        $request = Yii::$app->request;
        
        if ($role = $request->get('role')) {
            $query->andWhere(['role' => $role]);
        }
        
        if ($status = $request->get('status')) {
            $query->andWhere(['status' => $status]);
        }
        
        if ($search = $request->get('search')) {
            $query->andWhere(['or',
                ['like', 'username', $search],
                ['like', 'email', $search],
                ['like', 'first_name', $search],
                ['like', 'last_name', $search],
            ]);
        }

        $dataProvider = new ActiveDataProvider([
            'query' => $query,
            'pagination' => [
                'pageSize' => $request->get('per_page', 20),
                'page' => $request->get('page', 1) - 1,
            ],
            'sort' => [
                'defaultOrder' => ['created_at' => SORT_DESC],
                'attributes' => ['id', 'username', 'email', 'role', 'status', 'created_at', 'updated_at'],
            ],
        ]);

        $users = [];
        foreach ($dataProvider->getModels() as $user) {
            $users[] = [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'display_name' => $user->getDisplayName(),
                'role' => $user->role,
                'status' => $user->status,
                'last_login_at' => $user->last_login_at,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ];
        }

        return [
            'success' => true,
            'data' => $users,
            'pagination' => [
                'current_page' => $dataProvider->pagination->page + 1,
                'per_page' => $dataProvider->pagination->pageSize,
                'total_count' => $dataProvider->totalCount,
                'page_count' => $dataProvider->pagination->pageCount,
            ],
        ];
    }

    /**
     * View user details
     * GET /api/users/{id}
     */
    public function actionView($id)
    {
        $user = $this->findUser($id);

        return [
            'success' => true,
            'data' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'display_name' => $user->getDisplayName(),
                'role' => $user->role,
                'status' => $user->status,
                'last_login_at' => $user->last_login_at,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ],
        ];
    }

    /**
     * Create new user
     * POST /api/users
     */
    public function actionCreate()
    {
        $data = Json::decode(Yii::$app->request->rawBody);

        $userForm = new UserForm();
        $userForm->setAttributes($data);

        if (!$userForm->save()) {
            return [
                'success' => false,
                'message' => 'Failed to create user.',
                'errors' => $userForm->errors,
            ];
        }

        $user = $userForm->user;

        return [
            'success' => true,
            'message' => 'User created successfully.',
            'data' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'display_name' => $user->getDisplayName(),
                'role' => $user->role,
                'status' => $user->status,
                'created_at' => $user->created_at,
            ],
        ];
    }

    /**
     * Update user
     * PUT /api/users/{id}
     */
    public function actionUpdate($id)
    {
        $user = $this->findUser($id);
        $data = Json::decode(Yii::$app->request->rawBody);

        $userForm = new UserForm(['user' => $user]);
        $userForm->setAttributes($data);

        if (!$userForm->save()) {
            return [
                'success' => false,
                'message' => 'Failed to update user.',
                'errors' => $userForm->errors,
            ];
        }

        return [
            'success' => true,
            'message' => 'User updated successfully.',
            'data' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'display_name' => $user->getDisplayName(),
                'role' => $user->role,
                'status' => $user->status,
                'updated_at' => $user->updated_at,
            ],
        ];
    }

    /**
     * Delete user
     * DELETE /api/users/{id}
     */
    public function actionDelete($id)
    {
        $user = $this->findUser($id);

        // Prevent deleting the current user
        if ($user->id === Yii::$app->user->id) {
            return [
                'success' => false,
                'message' => 'Cannot delete your own account.',
            ];
        }

        // Soft delete by setting status to deleted
        $user->status = User::STATUS_DELETED;
        $user->revokeAccessToken();

        if (!$user->save()) {
            throw new ServerErrorHttpException('Failed to delete user.');
        }

        return [
            'success' => true,
            'message' => 'User deleted successfully.',
        ];
    }

    /**
     * Activate user
     * POST /api/users/{id}/activate
     */
    public function actionActivate($id)
    {
        $user = $this->findUser($id);
        $user->status = User::STATUS_ACTIVE;

        if (!$user->save()) {
            throw new ServerErrorHttpException('Failed to activate user.');
        }

        return [
            'success' => true,
            'message' => 'User activated successfully.',
        ];
    }

    /**
     * Deactivate user
     * POST /api/users/{id}/deactivate
     */
    public function actionDeactivate($id)
    {
        $user = $this->findUser($id);

        // Prevent deactivating the current user
        if ($user->id === Yii::$app->user->id) {
            return [
                'success' => false,
                'message' => 'Cannot deactivate your own account.',
            ];
        }

        $user->status = User::STATUS_INACTIVE;
        $user->revokeAccessToken();

        if (!$user->save()) {
            throw new ServerErrorHttpException('Failed to deactivate user.');
        }

        return [
            'success' => true,
            'message' => 'User deactivated successfully.',
        ];
    }

    /**
     * Get available roles and statuses
     * GET /api/users/options
     */
    public function actionOptions()
    {
        return [
            'success' => true,
            'data' => [
                'roles' => UserForm::getRoles(),
                'statuses' => UserForm::getStatuses(),
            ],
        ];
    }

    /**
     * Find user model by ID
     * @param int $id
     * @return User
     * @throws NotFoundHttpException
     */
    protected function findUser($id)
    {
        $user = User::findOne($id);
        
        if (!$user || $user->status === User::STATUS_DELETED) {
            throw new NotFoundHttpException('User not found.');
        }

        return $user;
    }
}
