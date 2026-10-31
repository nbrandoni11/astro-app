import test from 'node:test';
import assert from 'node:assert/strict';
import { findHelpTopic,helpTopics } from '../src/lib/support-knowledge';
test('help distinguishes concrete issues with accents and colloquial wording',()=>{
 for(const [question,id] of [['Me llegó una sola parte','one-part'],['No sé mi hora de nacimiento','birth-time'],['Mi tarjeta está rechazada','rejected'],['Ya pagué','reactivate'],['Quiero hablar con una persona','contact'],['No puedo entrar','login']])assert.equal(findHelpTopic(question)?.id,id,question);
});
test('guide covers over 35 topics, all followups resolve, unknown is not invented',()=>{
 assert.ok(helpTopics.length>=35);assert.equal(findHelpTopic('¿Cuál es mi color favorito?'),null);
 for(const topic of helpTopics)for(const id of topic.next??[])assert.ok(helpTopics.some(t=>t.id===id),id);
});
