import React from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { LockOutlined, EyeOutlined, EyeInvisibleOutlined, SaveOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { changePassword } from '../store/actions/authActions';

const PasswordChange = () => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await dispatch(changePassword(values.currentPassword, values.newPassword));
      message.success('密码修改成功');
      form.resetFields();
    } catch (error) {
      message.error(error.response?.data?.message || '密码修改失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="修改密码">
      <p style={{ marginBottom: 16 }}>请输入当前密码和新密码来修改您的登录密码。建议定期更换密码以确保账户安全。</p>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="当前密码"
          name="currentPassword"
          rules={[
            { required: true, message: '请输入当前密码' },
            { whitespace: true, message: '密码不能为空' }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请输入当前密码"
            iconRender={(visible) => (
              visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
            )}
          />
        </Form.Item>

        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码长度至少为6位' },
            { whitespace: true, message: '密码不能为空' }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请输入新密码"
            iconRender={(visible) => (
              visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
            )}
          />
        </Form.Item>

        <Form.Item
          label="确认新密码"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的新密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请再次输入新密码"
            iconRender={(visible) => (
              visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
            )}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            htmlType="submit"
            loading={loading}
          >
            保存新密码
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default PasswordChange;