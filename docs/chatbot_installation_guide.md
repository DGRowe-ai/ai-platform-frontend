# Rowe AI Chatbot Installation Guide

**A simple guide for adding your Rowe AI Chatbot to your website**

Welcome to Rowe AI. This guide walks you through how to add your chatbot to your website so visitors can ask questions, get helpful answers, and connect with your business more easily.

You do not need to be a technical expert to use this guide. If someone else manages your website, you can send them this document and the embed code from your Rowe AI dashboard.

---

## Table of Contents

1. [Before You Start](#before-you-start)
2. [Find Your Chatbot Embed Code](#find-your-chatbot-embed-code)
3. [Add the Chatbot to Your Website](#add-the-chatbot-to-your-website)
4. [Test the Chatbot](#test-the-chatbot)
5. [Website Platform Tips](#website-platform-tips)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)
8. [Support Contact](#support-contact)

---

## Before You Start

Before installing your chatbot, make sure you have:

- Access to your Rowe AI client dashboard
- Access to your website editor or website builder
- Your chatbot settings saved in the dashboard
- Your business information, FAQs, and knowledge base reviewed for accuracy

Your chatbot uses your saved settings to understand how it should respond to customers. This includes your welcome message, tone, response length, custom instructions, and FAQs.

[Screenshot: Insert here]

---

## Find Your Chatbot Embed Code

In your Rowe AI client dashboard, look for the section that shows your chatbot URL or embed code.

You may see a chatbot URL like this:

```text
https://ai-platform-frontend-uaaa.onrender.com/widget.js
```

You may also see an embed script like this:

```html
<script
  src="https://ai-platform-frontend-uaaa.onrender.com/widget.js"
  data-business="YOUR_BUSINESS_ID"
  defer
></script>
```

Replace `YOUR_BUSINESS_ID` with the business ID shown in your dashboard. If your dashboard already fills in your business ID, copy the code exactly as it appears.

[Screenshot: Insert here]

---

## Add the Chatbot to Your Website

The chatbot is installed by placing a small script on your website. Most businesses add it to every public page so visitors can open the chatbot from anywhere on the site.

### Step 1: Copy the Embed Code

From your Rowe AI dashboard, copy the full embed script.

Example:

```html
<script
  src="https://ai-platform-frontend-uaaa.onrender.com/widget.js"
  data-business="YOUR_BUSINESS_ID"
  defer
></script>
```

### Step 2: Open Your Website Editor

Log in to your website platform or website admin area.

Look for a section with a name like:

- Custom Code
- Code Injection
- Footer Code
- Header/Footer Scripts
- Tracking Scripts
- Theme Code

If you are not sure where to paste the code, send this guide to your web designer or website manager.

[Screenshot: Insert here]

### Step 3: Paste the Embed Script

Paste the embed script near the end of your website body, usually right before the closing `</body>` tag.

If your website builder has a global footer code area, that is usually the best place to add it.

### Step 4: Save and Publish

After pasting the script:

1. Save your changes.
2. Publish or update your website.
3. Open your website in a new browser tab.
4. Look for the chatbot bubble on the page.

[Screenshot: Insert here]

---

## Test the Chatbot

After the chatbot is installed, test it the same way a customer would.

Try asking questions like:

- What services do you offer?
- What are your business hours?
- How can I contact you?
- Do you offer appointments?
- Where are you located?

Check that the chatbot:

- Opens and closes correctly
- Responds in the tone you selected
- Uses your business information accurately
- Gives helpful answers based on your knowledge base

If the chatbot gives an answer that is not quite right, update your chatbot settings or knowledge base in the Rowe AI dashboard, save your changes, and test again.

[Screenshot: Insert here]

---

## Website Platform Tips

Different website platforms place custom code settings in different areas.

### WordPress

Use a header/footer script plugin or ask your web manager to add the script before the closing `</body>` tag.

### Shopify

Add the script to your theme file, often called `theme.liquid`, before the closing `</body>` tag.

### Squarespace

Look for:

```text
Settings > Advanced > Code Injection
```

Paste the script in the footer area if available.

### Wix

Use the Custom Code section in your Wix dashboard. Apply the code to all pages if you want the chatbot available across your website.

### Custom Website

Send the embed script to your developer and ask them to place it before the closing `</body>` tag on your website pages.

---

## Troubleshooting

### The Chatbot Does Not Appear

Try the following:

- Make sure the script was saved and published.
- Confirm the script URL starts with `https://`.
- Check that the `data-business` value is included.
- Open your website in a private or incognito browser window.
- Clear your website cache if your platform uses caching.

### The Chatbot Appears but Does Not Open

Try the following:

- Refresh the page.
- Make sure no other website pop-up tools are covering the chatbot.
- Check whether your website builder blocks custom scripts.
- Ask your website manager to confirm the script is loading correctly.

### The Chatbot Gives the Wrong Answer

Try the following:

- Review your knowledge base for missing information.
- Update your FAQs in the Rowe AI dashboard.
- Add clearer custom instructions.
- Save your settings and test again.

### The Website Builder Removes the Code

Some website builders remove scripts if they are pasted into a normal text box. Use the official Custom Code, Code Injection, or Footer Scripts area instead.

[Screenshot: Insert here]

---

## FAQ

### Do I need a developer to install the chatbot?

Not always. Many website builders let you paste custom code yourself. If you are unsure, send this guide and your embed code to your website manager.

### Where should I place the embed script?

The best place is usually in your global footer code area or right before the closing `</body>` tag.

### Can I add the chatbot to only one page?

Yes. Add the script only to the page where you want the chatbot to appear. For most businesses, adding it to every page is recommended.

### Can I change what the chatbot says?

Yes. You can update your welcome message, tone, custom instructions, FAQs, and knowledge base from your Rowe AI dashboard.

### Will the chatbot slow down my website?

The chatbot script is designed to be lightweight and load as a small widget. It should not interfere with your main website content.

### Can I remove the chatbot later?

Yes. Remove the embed script from your website and publish the change.

---

## Support Contact

If you need help installing or testing your chatbot, contact Rowe AI support.

When requesting help, please include:

- Your business name
- Your website URL
- A screenshot of where the code was added, if available
- A short description of what is happening
- Any error message you see

**Support Email:** support@roweai.com

---

## Final Checklist

Before you finish, confirm that:

- [ ] The embed script is added to your website
- [ ] Your website changes are published
- [ ] The chatbot bubble appears on your website
- [ ] The chatbot opens when clicked
- [ ] The chatbot answers basic business questions correctly
- [ ] Your knowledge base and FAQs are up to date

You are ready to launch your Rowe AI Chatbot.
