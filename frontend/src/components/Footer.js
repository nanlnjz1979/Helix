import { Layout, Typography, Space, Divider } from 'antd';
import { Link } from 'react-router-dom';
import { QuestionCircleOutlined, GithubOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';

const { Footer: AntFooter } = Layout;
const { Text, Paragraph, Title } = Typography;

const Footer = () => {
  return (
    <AntFooter style={{ backgroundColor: '#f0f2f5', padding: '30px 0' }}>
      <div className="footer-content">
        <div className="footer-section">
          <Title level={4} style={{ marginBottom: '16px' }}>量化交易平台</Title>
          <Paragraph>
            提供专业的量化交易策略开发、回测和自动交易服务，助力投资者实现智能化交易。
          </Paragraph>
        </div>
        
        <div className="footer-section">
          <Title level={4} style={{ marginBottom: '16px' }}>快速链接</Title>
          <Space direction="vertical" size="large">
            <Link to="/dashboard" className="footer-link">仪表盘</Link>
            <Link to="/market" className="footer-link">市场行情</Link>
            <Link to="/strategy" className="footer-link">交易策略</Link>
            <Link to="/faq" className="footer-link highlight-link">
              <Space>
                <QuestionCircleOutlined />
                <span>常见问题</span>
              </Space>
            </Link>
          </Space>
        </div>
        
        <div className="footer-section">
          <Title level={4} style={{ marginBottom: '16px' }}>联系我们</Title>
          <Space direction="vertical" size="large">
            <Space>
              <MailOutlined />
              <Text>support@lianghuaquant.com</Text>
            </Space>
            <Space>
              <PhoneOutlined />
              <Text>+86 123 4567 8910</Text>
            </Space>
            <Space>
              <GithubOutlined />
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer-link">GitHub 仓库</a>
            </Space>
          </Space>
        </div>
      </div>
      
      <Divider style={{ margin: '20px 0' }} />
      
      <div className="footer-copyright">
        <Text type="secondary">
          © {new Date().getFullYear()} 量化交易平台. 保留所有权利.
        </Text>
      </div>
    </AntFooter>
  );
};

export default Footer;