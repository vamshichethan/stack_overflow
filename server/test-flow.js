import axios from 'axios';
import crypto from 'crypto';

const baseURL = 'http://localhost:5001';
let token = '';
let userId = '';
const email = `test${Date.now()}@test.com`;

async function runTest() {
  console.log("=== Starting Automated Backend Flow Test ===");

  try {
    // 1. Sign up
    console.log("1. Signing up test user...");
    const signupRes = await axios.post(`${baseURL}/user/signup`, {
      name: "Test User",
      email: email,
      password: "password123"
    });
    token = signupRes.data.token;
    userId = signupRes.data.result._id;
    console.log("   ✅ Signed up successfully!");

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // 2. Ask 1st question (Free Tier limit = 1)
    console.log("\n2. Asking 1st question (Free Plan)...");
    await axios.post(`${baseURL}/question/ask`, {
      postquestiondata: {
        questiontitle: "First Question",
        questionbody: "This is my first question on the free plan.",
        questiontags: ["test"],
        userposted: "Test User",
        userid: userId
      }
    }, authHeaders);
    console.log("   ✅ 1st question posted successfully!");

    // 3. Ask 2nd question (Should fail)
    console.log("\n3. Asking 2nd question (Should hit limit)...");
    try {
      await axios.post(`${baseURL}/question/ask`, {
        postquestiondata: {
          questiontitle: "Second Question",
          questionbody: "This is my second question on the free plan.",
          questiontags: ["test"],
          userposted: "Test User",
          userid: userId
        }
      }, authHeaders);
      console.log("   ❌ FAILED: 2nd question was allowed but should have been blocked!");
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log(`   ✅ BLOCKED as expected: "${err.response.data.message}"`);
      } else {
        throw err;
      }
    }

    // 4. Upgrade Plan
    console.log("\n4. Upgrading to Bronze Plan via Mock Payment...");
    
    // a. Create Order
    const orderRes = await axios.post(`${baseURL}/payment/create-order`, {
      plan: "Bronze",
      amount: 100
    }, authHeaders);
    const orderId = orderRes.data.id;
    console.log(`   ✅ Order created: ${orderId}`);

    // b. Verify Payment (We mock Razorpay signature since we have the secret)
    const secret = "RNMb1OmWCUnck4eY2vamaggB"; // from server/.env
    const paymentId = "pay_mock123";
    
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(`${orderId}|${paymentId}`);
    const signature = shasum.digest("hex");

    await axios.post(`${baseURL}/payment/verify-payment`, {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      plan: "Bronze",
      userId: userId
    }, authHeaders);
    
    console.log("   ✅ Subscription upgraded to Bronze!");

    // 5. Ask 2nd question again (Should succeed now)
    console.log("\n5. Asking 2nd question again (Bronze Plan)...");
    await axios.post(`${baseURL}/question/ask`, {
      postquestiondata: {
        questiontitle: "Second Question",
        questionbody: "This is my second question on the bronze plan.",
        questiontags: ["test"],
        userposted: "Test User",
        userid: userId
      }
    }, authHeaders);
    console.log("   ✅ 2nd question posted successfully after upgrade!");
    
    console.log("\n=== All tests passed successfully! ===");
  } catch (error) {
    console.error("\n❌ TEST FAILED ❌");
    console.error("Message:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Response Data:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

runTest();
