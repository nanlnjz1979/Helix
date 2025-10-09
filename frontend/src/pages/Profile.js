import React, { useState } from 'react';
import { Card, Form, Input, Button, Divider, message } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import PasswordChange from '../components/PasswordChange';

const Profile = () => {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const [editing, setEditing] = useState(false);
  const [profileForm] = Form.useForm();

  // 初始化表单数据
  React.useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        fullName: user.fullName || ''
      });
    }
  }, [user, profileForm]);

  // 保存用户资料
  const handleSaveProfile = () => {
    profileForm.validateFields().then(values => {
      // 在实际应用中，这里应该调用API更新用户资料
      dispatch({ 
        type: 'UPDATE_USER_PROFILE', 
        payload: { ...user, ...values } 
      });
      setEditing(false);
      message.success('个人资料已更新');
    });
  };



  return (
    <div>
      <h2>个人资料</h2>
      
      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Form form={profileForm} layout="vertical">
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input disabled={!editing} prefix={<UserOutlined />} />
          </Form.Item>
          
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input disabled={!editing} prefix={<MailOutlined />} />
          </Form.Item>
          
          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
            ]}
          >
            <Input disabled={!editing} prefix={<PhoneOutlined />} />
          </Form.Item>
          
          <Form.Item
            label="姓名"
            name="fullName"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input disabled={!editing} />
          </Form.Item>
          
          {!editing ? (
            <Button 
              type="primary" 
              icon={<EditOutlined />} 
              onClick={() => setEditing(true)}
            >
              编辑资料
            </Button>
          ) : (
            <div>
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={handleSaveProfile}
                style={{ marginRight: 8 }}
              >
                保存
              </Button>
              <Button onClick={() => {
                setEditing(false);
                profileForm.resetFields();
              }}>
                取消
              </Button>
            </div>
          )}
        </Form>
      </Card>
      
      <Divider />
      
      <PasswordChange />
    </div>
  );
};

export default Profile;