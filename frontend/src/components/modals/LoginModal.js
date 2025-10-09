import React from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import './LoginModal.css';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login } from '../../store/actions/authActions';

const LoginModal = ({ visible, onCancel }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, isAuthenticated, user } = useSelector(state => state.auth);
  const [messageShown, setMessageShown] = React.useState(false);

  // 登录成功后处理
  React.useEffect(() => {
    if (isAuthenticated && user && !messageShown) {
      message.success('登录成功');
      setMessageShown(true); // 标记消息已显示
      onCancel(); // 关闭模态框
      form.resetFields(); // 重置表单
      
      // 登录成功后在前端应用内部导航到相应的页面（根据用户角色）
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate, onCancel, form, messageShown]);

  // 当模态框关闭时重置消息显示状态
  React.useEffect(() => {
    if (!visible) {
      setMessageShown(false);
    }
  }, [visible]);

  const handleSubmit = async (values) => {
    try {
      await dispatch(login(values.username, values.password));
    } catch (error) {
      message.error('登录失败，请检查用户名和密码是否正确');
    }
  };

  const handleCancel = () => {
    // 重置表单
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="量化交易平台 - 登录"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={400}
      centered
      mask={true}
      maskClosable={false}
      className="login-modal"
    >
      <Form
        form={form}
        name="login_modal"
        initialValues={{ remember: true }}
        onFinish={handleSubmit}
        layout="vertical"
      >
        <Form.Item
          name="username"
          rules={[
            { required: true, message: '请输入用户名!' },
            { whitespace: true, message: '用户名不能为空!' }
          ]}
          label="用户名"
        >
          <Input 
            prefix={<UserOutlined />} 
            placeholder="请输入用户名"
            className="login-input"
            autoFocus
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[
            { required: true, message: '请输入密码!' },
            { whitespace: true, message: '密码不能为空!' }
          ]}
          label="密码"
        >
          <Input.Password 
            prefix={<LockOutlined />} 
            placeholder="请输入密码"
            className="login-input"
          />
        </Form.Item>

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading} 
            block
            className="login-button"
            size="large"
          >
            登录
          </Button>
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            还没有账号? <a href="/register" onClick={(e) => {
              e.preventDefault();
              onCancel();
              navigate('/register');
            }}>立即注册</a>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LoginModal;