import {Template} from "aws-cdk-lib/assertions";
import {App} from "aws-cdk-lib";
import {AwsExamStack} from "../lib/aws-exam-stack";

test('SQS Queue Created', () => {
   const app = new App();
   const stack = new AwsExamStack(app, 'MyTestStack');
   const template = Template.fromStack(stack);

   expect(template).toMatchSnapshot();

});
