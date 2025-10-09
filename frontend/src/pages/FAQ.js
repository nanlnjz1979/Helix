import { Collapse } from 'antd';
import './FAQ.css';

const { Panel } = Collapse;

const FAQ = () => {
  // 账户相关问题
  const accountFAQs = [
    {
      question: '如何注册量化交易平台账户？',
      answer: '您可以点击网站右上角的"注册"按钮，填写必要的个人信息并完成邮箱验证即可完成注册。注册过程中，请确保提供真实有效的信息以便我们为您提供更好的服务。'
    },
    {
      question: '忘记密码怎么办？',
      answer: '在登录页面点击"忘记密码"链接，按照提示输入您的注册邮箱，系统将发送密码重置链接到您的邮箱。请通过该链接重置您的密码。如果您未收到邮件，请检查垃圾邮件文件夹。'
    },
    {
      question: '如何保障账户安全？',
      answer: '我们建议您：1) 使用强密码并定期更换；2) 启用两步验证；3) 不要与他人分享您的登录凭证；4) 定期检查您的账户活动记录；5) 使用安全的网络连接访问平台。'
    },
    {
      question: '可以在多台设备上同时登录账户吗？',
      answer: '是的，您可以在多台设备上同时登录账户。但为了账户安全，我们会向您的注册邮箱发送登录提醒。如果您发现可疑登录活动，请立即联系客服并修改密码。'
    }
  ];

  // 平台功能相关问题
  const platformFAQs = [
    {
      question: '什么是量化交易？',
      answer: '量化交易是利用计算机程序和数学模型来辅助交易决策的一种交易方式。它通过对历史数据的分析，寻找市场规律和交易机会，然后自动执行交易策略。这种方式可以减少人为情绪对交易的影响，提高交易效率和一致性。'
    },
    {
      question: '如何使用仪表盘功能？',
      answer: '仪表盘提供了您账户的概览信息，包括资产状况、交易历史、策略运行状态等。登录后，您可以在左侧菜单栏点击"仪表盘"进入。您还可以根据自己的需求自定义仪表盘显示内容和布局。'
    },
    {
      question: '市场行情数据更新频率是多少？',
      answer: '我们的市场行情数据实时更新，更新频率根据不同的交易品种和数据源有所不同。大多数主流交易品种的行情数据更新频率为毫秒级，确保您获得最新的市场动态。'
    },
    {
      question: '如何查看和编辑我的个人资料？',
      answer: '登录后，点击右上角的用户头像，在下拉菜单中选择"个人资料"即可进入个人资料页面。在该页面，您可以查看和编辑个人信息、联系方式、安全设置等。'
    }
  ];

  // 交易相关问题
  const tradingFAQs = [
    {
      question: '如何创建和测试交易策略？',
      answer: '您可以在"交易策略"页面创建新的交易策略，使用我们提供的策略编辑器编写代码。创建完成后，您可以使用"策略回测"功能，选择历史数据时间段对策略进行回测，评估策略的盈利能力、风险水平等指标。'
    },
    {
      question: '什么是策略回测？如何进行回测？',
      answer: '策略回测是使用历史市场数据来模拟交易策略的运行，评估其性能的过程。在"策略回测"页面，选择您要回测的策略，设置回测参数（如初始资金、测试时间段等），然后点击"开始回测"按钮即可。回测完成后，系统会生成详细的回测报告。'
    },
    {
      question: '如何启动自动交易？',
      answer: '在完成策略创建和回测并确认策略表现良好后，您可以在"自动交易"页面选择要启动的策略，设置实盘交易参数（如资金分配、交易品种等），然后点击"启动交易"按钮。系统将根据策略自动执行交易操作。'
    },
    {
      question: '如何查看交易历史记录？',
      answer: '您可以在"交易历史"页面查看所有的交易记录，包括手动交易和自动交易。您可以根据时间、交易品种、交易类型等条件筛选和搜索交易记录，导出交易历史数据用于分析。'
    }
  ];

  // 费用和收费相关问题
  const feeFAQs = [
    {
      question: '使用量化交易平台需要支付哪些费用？',
      answer: '我们提供免费版和付费版两种服务。免费版包含基本功能，付费版提供更多高级功能和数据服务。此外，实际交易产生的佣金和手续费由您选择的交易所收取，我们不收取额外费用。'
    },
    {
      question: '付费版和免费版有什么区别？',
      answer: '付费版相比免费版，提供更多的策略模板、更高级的回测功能、更大的数据存储空间、优先的技术支持等。具体的功能差异可以在"会员中心"页面查看详细说明。'
    },
    {
      question: '如何升级到付费版？',
      answer: '登录后，点击"会员中心"或直接联系客服，选择适合您的付费套餐，按照提示完成支付即可升级。升级后，您将立即享受付费版的所有功能。'
    },
    {
      question: '是否支持退款？',
      answer: '我们提供30天无条件退款保证。如果您在购买付费版后30天内对服务不满意，可以联系客服申请全额退款。30天后，根据我们的退款政策，将视具体情况处理退款申请。'
    }
  ];

  // 技术支持相关问题
  const techFAQs = [
    {
      question: '遇到技术问题如何寻求帮助？',
      answer: '您可以通过以下方式获取帮助：1) 查看我们的帮助文档和教程；2) 在"常见问题"页面查找答案；3) 联系在线客服；4) 发送邮件至support@lianghuaquant.com；5) 加入我们的社区论坛与其他用户交流。'
    },
    {
      question: '平台支持哪些编程语言编写交易策略？',
      answer: '目前我们的平台主要支持JavaScript和Python两种编程语言编写交易策略。我们提供了丰富的API文档和示例代码，帮助您快速上手编写自己的交易策略。'
    },
    {
      question: '如何连接外部数据源？',
      answer: '您可以在"系统设置"-"数据源"页面配置外部数据源连接。我们支持多种常见的数据源格式和协议。如果您需要连接特定的数据源，请联系客服获取详细的配置指南。'
    },
    {
      question: '平台是否提供API接口？',
      answer: '是的，我们提供完整的REST API和WebSocket API接口，允许您通过编程方式访问平台的各种功能，如获取市场数据、管理交易策略、查询账户信息等。详细的API文档可以在"开发者中心"页面查看。'
    }
  ];

  return (
    <div className="faq-container">
      <h1 className="faq-title">常见问题</h1>
      
      <div className="faq-section">
        <h2 className="faq-section-title">账户相关</h2>
        <Collapse defaultActiveKey={['0']} type="card" size="large">
          {accountFAQs.map((faq, index) => (
            <Panel key={index} header={faq.question}>
              <p>{faq.answer}</p>
            </Panel>
          ))}
        </Collapse>
      </div>

      <div className="faq-section">
        <h2 className="faq-section-title">平台功能</h2>
        <Collapse type="card" size="large">
          {platformFAQs.map((faq, index) => (
            <Panel key={index} header={faq.question}>
              <p>{faq.answer}</p>
            </Panel>
          ))}
        </Collapse>
      </div>

      <div className="faq-section">
        <h2 className="faq-section-title">交易相关</h2>
        <Collapse type="card" size="large">
          {tradingFAQs.map((faq, index) => (
            <Panel key={index} header={faq.question}>
              <p>{faq.answer}</p>
            </Panel>
          ))}
        </Collapse>
      </div>

      <div className="faq-section">
        <h2 className="faq-section-title">费用和收费</h2>
        <Collapse type="card" size="large">
          {feeFAQs.map((faq, index) => (
            <Panel key={index} header={faq.question}>
              <p>{faq.answer}</p>
            </Panel>
          ))}
        </Collapse>
      </div>

      <div className="faq-section">
        <h2 className="faq-section-title">技术支持</h2>
        <Collapse type="card" size="large">
          {techFAQs.map((faq, index) => (
            <Panel key={index} header={faq.question}>
              <p>{faq.answer}</p>
            </Panel>
          ))}
        </Collapse>
      </div>

      <div className="faq-contact">
        <p>如果您的问题没有在上述常见问题中找到答案，请联系我们的客服团队获取帮助：</p>
        <p>邮箱：support@lianghuaquant.com</p>
        <p>工作时间：周一至周五 9:00-18:00</p>
      </div>
    </div>
  );
};

export default FAQ;