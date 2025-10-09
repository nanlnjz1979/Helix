import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox, message, Modal } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, PhoneOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { register } from '../../store/actions/authActions';
import './RegisterModal.css';

const RegisterModal = ({ visible, onCancel, onRegisterSuccess }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreement, setAgreement] = useState(false);

  // 添加调试日志
  useEffect(() => {
    console.log('RegisterModal visible:', visible);
  }, [visible]);

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const { username, email, fullName, phone, password } = values;
      console.log('Submitting registration form:', values);
      await dispatch(register(username, email, fullName, phone, password));
      
      if (onRegisterSuccess) {
        onRegisterSuccess();
      }
      
      message.success('注册成功！');
      form.resetFields();
      setAgreement(false);
      onCancel();
    } catch (error) {
      console.error('Registration failed:', error);
      message.error('注册失败，请检查输入或稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="用户注册"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={400}
      centered
      mask={true}
      maskClosable={false}
      className="register-modal"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="register-form"
      >
        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, max: 20, message: '用户名长度应在3-20个字符之间' }
          ]}
        >
          <Input
            prefix={<UserOutlined className="site-form-item-icon" />}
            placeholder="请输入用户名"
          />
        </Form.Item>

        <Form.Item
          name="fullName"
          label="姓名"
          rules={[
            { required: true, message: '请输入姓名' }
          ]}
        >
          <Input placeholder="请输入您的姓名" />
        </Form.Item>

        <Form.Item
          name="email"
          label="邮箱"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' }
          ]}
        >
          <Input
            prefix={<MailOutlined className="site-form-item-icon" />}
            placeholder="请输入邮箱"
          />
        </Form.Item>

        <Form.Item
          name="phone"
          label="手机号"
          rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
          ]}
        >
          <Input
            prefix={<PhoneOutlined className="site-form-item-icon" />}
            placeholder="请输入手机号"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="密码"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码长度至少为6个字符' },
            { pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/, message: '密码至少包含字母和数字' }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="site-form-item-icon" />}
            placeholder="请输入密码"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="确认密码"
          dependencies={['password']}
          rules={[
            { required: true, message: '请确认密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              }
            })
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="site-form-item-icon" />}
            placeholder="请确认密码"
          />
        </Form.Item>

        <Form.Item
          name="agreement"
          valuePropName="checked"
          rules={[
            { required: true, message: '请阅读并同意用户协议和隐私政策' }
          ]}
        >
          <Checkbox checked={agreement} onChange={(e) => setAgreement(e.target.checked)}>
            我已阅读并同意 <a href="#" onClick={(e) => e.preventDefault()}>用户协议</a> 和 <a href="#" onClick={(e) => e.preventDefault()}>隐私政策</a>
          </Checkbox>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            className="register-submit-button"
            loading={isSubmitting}
            block
          >
            注册
          </Button>
        </Form.Item>

        <div className="register-form-footer">
          <span>已有账号？</span>
          <a href="#" onClick={(e) => {
            e.preventDefault();
            onCancel();
            if (window.showLoginModal) {
              window.showLoginModal();
            }
          }}>
            立即登录
          </a>
        </div>
      </Form>
    </Modal>
  );
};

export default RegisterModal;